// useTutorBrain hook — conversation loop orchestrator with AI SDK tool calling
// Coordinates: student speaks → Claude responds (SSE stream) → avatar speaks + tools execute
// See: specs/001-minerva-mvp/plan.md (Core Session Flow)
//
// SSE streaming pipeline with tool calling:
// The API returns an SSE stream with these events:
// - "speech" — text to speak (emitted early for low latency)
// - "tool-call" — tool invocation (executeCanvasCommands, showSandbox, setContentMode)
// - "tool-result" — server-executed tool result (showVideo, updateProgress)
// - "done" — stream complete
// - "error" — fallback speech on error
//
// Client-side tools: executeCanvasCommands, showSandbox, setContentMode
// Server-side tools: showVideo, updateProgress

"use client";

import { useState, useCallback, useRef } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import type { TutorBrainRequest, ContentMode, CanvasCommand } from "@/types/session";

interface UseTutorBrainOptions {
  speak: (text: string) => Promise<void>;
  interrupt: () => void;
  executeSequence: (
    cmds: CanvasCommand[],
    delayMs?: number
  ) => Promise<void>;
  getSnapshot: () => string;
}

const API_TIMEOUT_MS = 5 * 60 * 1000; // 5 minute timeout — Manim video generation can take 60-120+ seconds

// Parse SSE events from a text buffer. Returns parsed events and remaining unparsed text.
function parseSSEBuffer(buffer: string): {
  events: Record<string, unknown>[];
  remaining: string;
} {
  const events: Record<string, unknown>[] = [];
  const parts = buffer.split("\n\n");
  const remaining = parts.pop()!; // last part may be incomplete

  for (const raw of parts) {
    const trimmed = raw.trim();
    if (!trimmed.startsWith("data: ")) continue;
    try {
      events.push(JSON.parse(trimmed.slice(6)));
    } catch {
      console.warn("[useTutorBrain] Failed to parse SSE event:", trimmed);
    }
  }

  return { events, remaining };
}

export function useTutorBrain(options: UseTutorBrainOptions) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const abortRef = useRef<AbortController | null>(null);

  // ─── Shared SSE stream consumer ─────────────────────────────────────────
  // Handles speech events, tool calls, and tool results from the SSE stream.
  async function consumeStream(
    res: Response,
    controller: AbortController,
    opts: {
      onSpeech: (speech: string) => void;
      timeoutId: ReturnType<typeof setTimeout>;
      t0?: number; // latency tracking start time
    }
  ): Promise<void> {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = "";
    let speechHandled = false;
    let speakPromise: Promise<void> | null = null;
    let firstChunkLogged = false;

    const store = useSessionStore.getState();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (controller.signal.aborted) break;

        if (!firstChunkLogged && opts.t0) {
          firstChunkLogged = true;
          console.log(
            `[Latency] SSE_FIRST_CHUNK +${(performance.now() - opts.t0).toFixed(0)}ms | first bytes from server`
          );
        }

        sseBuffer += decoder.decode(value, { stream: true });
        const { events, remaining } = parseSSEBuffer(sseBuffer);
        sseBuffer = remaining;

        for (const event of events) {
          // ── Speech event: start avatar speaking immediately ──
          if (event.type === "speech" && !speechHandled) {
            speechHandled = true;
            clearTimeout(opts.timeoutId); // connection alive, speech received

            if (opts.t0) {
              console.log(
                `[Latency] SSE_SPEECH_EVENT +${(performance.now() - opts.t0).toFixed(0)}ms | "${(event.speech as string).slice(0, 60)}..."`
              );
            }

            setIsThinking(false);

            const speech = event.speech as string;
            opts.onSpeech(speech);

            if (opts.t0) {
              console.log(
                `[Latency] CALLING_SPEAK +${(performance.now() - opts.t0).toFixed(0)}ms | handing to avatar`
              );
            }
            // Fire speak — don't await, let tool events process while avatar talks
            speakPromise = optionsRef.current.speak(speech);
          }

          // ── Tool call events: execute client-side tools ──
          if (event.type === "tool-call") {
            const toolName = event.toolName as string;
            const input = event.input as Record<string, unknown>;

            if (opts.t0) {
              console.log(
                `[Latency] TOOL_CALL +${(performance.now() - opts.t0).toFixed(0)}ms | ${toolName}`
              );
            }

            switch (toolName) {
              case "executeCanvasCommands": {
                const commands = input.commands as CanvasCommand[];
                if (commands && commands.length > 0) {
                  // Switch to math mode if not already
                  if (store.contentMode !== "math") {
                    store.setContentMode("math");
                  }
                  optionsRef.current
                    .executeSequence(commands)
                    .catch((err) =>
                      console.error("[useTutorBrain] Canvas error:", err)
                    );
                }
                break;
              }

              case "showSandbox": {
                const content = input.content as string;
                const accent = input.accent as string;
                if (content) {
                  store.setSandboxContent(content, accent);
                  store.setContentMode("sandbox");
                }
                break;
              }

              case "setContentMode": {
                const mode = input.mode as ContentMode;
                if (mode) {
                  store.setContentMode(mode);
                }
                break;
              }

              // Client doesn't handle showVideo or updateProgress — server executes those
              default:
                console.log(`[useTutorBrain] Unhandled tool call: ${toolName}`);
            }
          }

          // ── Tool result events: handle server-executed tool results ──
          if (event.type === "tool-result") {
            const toolName = event.toolName as string;
            const output = event.output as Record<string, unknown>;

            if (opts.t0) {
              console.log(
                `[Latency] TOOL_RESULT +${(performance.now() - opts.t0).toFixed(0)}ms | ${toolName}`
              );
            }

            switch (toolName) {
              case "showVideo": {
                const videoUrl = output.videoUrl as string | undefined;
                if (videoUrl) {
                  store.setVideoUrl(videoUrl);
                  store.setContentMode("video");
                } else if (output.error) {
                  console.error("[useTutorBrain] Video error:", output.error);
                }
                break;
              }

              case "updateProgress": {
                // Progress was saved server-side, nothing to do client-side
                console.log("[useTutorBrain] Progress updated:", output);
                break;
              }

              default:
                console.log(`[useTutorBrain] Unhandled tool result: ${toolName}`);
            }
          }

          // ── Done event: stream complete ──
          if (event.type === "done") {
            if (opts.t0) {
              console.log(
                `[Latency] SSE_DONE +${(performance.now() - opts.t0).toFixed(0)}ms | stream complete`
              );
            }
          }

          // ── Error event: fallback speech ──
          if (event.type === "error" && !speechHandled) {
            speechHandled = true;
            clearTimeout(opts.timeoutId);
            setIsThinking(false);
            const speech =
              (event.speech as string) ||
              "I'm having some trouble. Can you try that again?";
            opts.onSpeech(speech);
            speakPromise = optionsRef.current.speak(speech);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Wait for avatar to finish speaking
    if (speakPromise) await speakPromise;
  }

  // ─── Handle student message (speech or text) ───────────────────────────
  const handleStudentMessage = useCallback(
    async (
      message: string,
      imageData?: TutorBrainRequest["imageData"]
    ) => {
      const t0 = performance.now();
      console.log(
        `[Latency] BRAIN_RECEIVED +0ms | "${message.slice(0, 80)}"`
      );

      const store = useSessionStore.getState();

      // Abort any in-flight request before starting a new one
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }

      // Interrupt avatar if it's still speaking
      optionsRef.current.interrupt();

      setIsProcessing(true);
      setIsThinking(true);

      // Add student message to store
      store.addMessage({ role: "user", content: message });
      store.addTranscriptEntry({
        speaker: "student",
        text: message,
        timestamp: new Date(),
      });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // Opt 3: skip empty canvas snapshot
        const snapshot = optionsRef.current.getSnapshot();
        const canvasState =
          snapshot === "Canvas is empty." ? "" : snapshot;

        const request: TutorBrainRequest & { sessionId?: string; learningPlanSubject?: string } = {
          studentMessage: message,
          conversationHistory: store.conversationHistory,
          learningPlan: store.learningPlan,
          studentProfile: store.studentProfile ?? {
            name: "Student",
            age: 12,
            grade: 7,
          },
          canvasState,
          ...(imageData && { imageData }),
          ...(store.masteryScores.length > 0 && {
            masteryScores: store.masteryScores,
          }),
          // Pass session context for server-side tool execution
          sessionId: store.sessionId ?? undefined,
          learningPlanSubject: store.learningPlan?.subject,
        };

        console.log(
          `[Latency] FETCH_START +${(performance.now() - t0).toFixed(0)}ms | POST /api/tutor/respond`
        );

        const timeoutId = setTimeout(
          () => controller.abort(),
          API_TIMEOUT_MS
        );

        const res = await fetch("/api/tutor/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        console.log(
          `[Latency] FETCH_RESPONSE +${(performance.now() - t0).toFixed(0)}ms | status=${res.status}`
        );

        if (controller.signal.aborted) return;

        await consumeStream(res, controller, {
          t0,
          timeoutId,
          onSpeech: (speech) => {
            store.addMessage({ role: "assistant", content: speech });
            store.addTranscriptEntry({
              speaker: "tutor",
              text: speech,
              timestamp: new Date(),
            });
          },
        });
      } catch (err) {
        // Don't log abort errors — they're expected
        if (err instanceof DOMException && err.name === "AbortError") {
          console.log(
            "[useTutorBrain] Request aborted (new message or timeout)"
          );
          return;
        }
        console.error("[useTutorBrain] Error:", err);
        await optionsRef.current
          .speak("I'm having a little trouble. Can you try that again?")
          .catch(console.error);
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        setIsProcessing(false);
        setIsThinking(false);
      }
    },
    []
  );

  // ─── Greeting — no fake "hi" in transcript ─────────────────────────────
  const sendGreeting = useCallback(async () => {
    const store = useSessionStore.getState();

    setIsProcessing(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const request: TutorBrainRequest = {
        studentMessage:
          "[Session started — greet the student warmly and ask what they'd like to learn today]",
        conversationHistory: [],
        learningPlan: store.learningPlan,
        studentProfile: store.studentProfile ?? {
          name: "Student",
          age: 12,
          grade: 7,
        },
        canvasState: "",
      };

      const timeoutId = setTimeout(
        () => controller.abort(),
        API_TIMEOUT_MS
      );

      const res = await fetch("/api/tutor/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      await consumeStream(res, controller, {
        timeoutId,
        onSpeech: (speech) => {
          // Only add the tutor's greeting to history (no fake student message)
          store.addMessage({ role: "assistant", content: speech });
          store.addTranscriptEntry({
            speaker: "tutor",
            text: speech,
            timestamp: new Date(),
          });
        },
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[useTutorBrain] Greeting error:", err);
      await optionsRef.current
        .speak(
          "Hello! I'm Minerva, your AI tutor. What would you like to learn today?"
        )
        .catch(console.error);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setIsProcessing(false);
      setIsThinking(false);
    }
  }, []);

  return { isProcessing, isThinking, handleStudentMessage, sendGreeting };
}
