// useTutorBrain hook — conversation loop orchestrator with AI SDK tool calling
// Coordinates: student speaks → Claude responds (SSE stream) → avatar speaks + tools execute
// See: specs/001-minerva-mvp/plan.md (Core Session Flow)
//
// SSE streaming pipeline with tool calling (LITE mode):
// The API returns an SSE stream with these events:
// - "speech" — text for chat display (emitted early for low latency)
// - "audio" — base64 PCM 24kHz chunk from ElevenLabs TTS
// - "audio-end" — end of audio for current speech → decode + send to avatar
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
import type { TutorBrainRequest, ContentMode, ContentStep, CanvasCommand } from "@/types/session";

interface UseTutorBrainOptions {
  speak: (text: string) => Promise<void>;
  speakAudio: (pcmBase64: string) => Promise<void>;
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
    let audioChunks: string[] = []; // base64 PCM chunks from ElevenLabs TTS
    let audioReceived = false; // true once we get at least one audio event

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
          // ── Speech event: add to chat (avatar audio comes via separate audio events) ──
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

            // NOTE: In LITE mode, we do NOT call speak(text) here.
            // Avatar lip-sync is driven by audio events from ElevenLabs TTS.
            // speak(text) is only used as a fallback if no audio arrives (see audio-end handling).
          }

          // ── Audio event: accumulate Base64 PCM chunks from ElevenLabs TTS ──
          if (event.type === "audio") {
            audioReceived = true;
            audioChunks.push(event.audio as string);
          }

          // ── Audio-end event: send sentence audio to avatar for lip-sync ──
          // Server sends audio+audio-end PER SENTENCE for low latency.
          // We chain speakAudio() calls so sentences play sequentially.
          if (event.type === "audio-end") {
            const pcmBase64 = audioChunks.join("");
            audioChunks = [];

            if (pcmBase64.length === 0) continue;

            if (opts.t0) {
              console.log(
                `[Latency] AUDIO_END +${(performance.now() - opts.t0).toFixed(0)}ms | ${pcmBase64.length} chars Base64`
              );
            }

            // Chain with previous promise so sentences play in order.
            // First sentence starts immediately; subsequent sentences queue up.
            const prev: Promise<void> = speakPromise || Promise.resolve();
            speakPromise = prev.then(() =>
              optionsRef.current.speakAudio(pcmBase64).catch((err) => {
                console.warn("[useTutorBrain] Avatar speakAudio error:", err);
              })
            );
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
                  // Unified board: add as inline sandbox block instead of switching modes
                  store.addSteps([{ type: "sandbox", html: content, accent }]);
                  store.setContentMode("steps");
                  // Also store raw content for context serialization
                  store.setSandboxContent(content, accent);
                }
                break;
              }

              case "showSteps": {
                const steps = input.steps as ContentStep[];
                if (steps && steps.length > 0) {
                  store.addSteps(steps);
                  store.setContentMode("steps");
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
                  // Unified board: add as inline video block instead of switching modes
                  store.addSteps([{ type: "video", url: videoUrl, autoPlay: true }]);
                  store.setContentMode("steps");
                  // Also store raw URL for context serialization
                  store.setVideoUrl(videoUrl);
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

          // ── Error event: fallback speech (text-only, no audio) ──
          if (event.type === "error" && !speechHandled) {
            speechHandled = true;
            clearTimeout(opts.timeoutId);
            setIsThinking(false);
            const speech =
              (event.speech as string) ||
              "I'm having some trouble. Can you try that again?";
            opts.onSpeech(speech);
            // Error fallback: use text-based speak() since no TTS audio
            speakPromise = optionsRef.current.speak(speech);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Stream ended — check if fallback needed

    // Fallback: if speech was received but no audio events, use text-based speak()
    // This handles the case where ElevenLabs TTS fails server-side
    if (speechHandled && !audioReceived && !speakPromise) {
      console.warn("[useTutorBrain] No audio received — falling back to text speak()");
      speakPromise = optionsRef.current.speak(
        store.conversationHistory[store.conversationHistory.length - 1]?.content || ""
      );
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
          contentSteps: store.contentSteps,
          sandboxContent: store.sandboxContent,
          sandboxAccent: store.sandboxAccent,
          videoUrl: store.videoUrl,
          modelId: store.selectedModel,
          contentMode: store.contentMode,
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
        modelId: store.selectedModel,
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

  // ─── Video ended — auto-continue lesson (no student message) ──────────
  const handleVideoEnded = useCallback(async () => {
    const store = useSessionStore.getState();

    // Don't trigger if already processing another request
    if (abortRef.current) return;

    setIsProcessing(true);
    setIsThinking(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const request: TutorBrainRequest = {
        studentMessage:
          "[VIDEO_ENDED — The animation just finished playing. Continue the lesson: ask the student what they noticed or understood from the animation, then guide them to apply the concept. Transition to practice on the canvas.]",
        conversationHistory: store.conversationHistory,
        learningPlan: store.learningPlan,
        studentProfile: store.studentProfile ?? {
          name: "Student",
          age: 12,
          grade: 7,
        },
        canvasState: "",
        contentSteps: store.contentSteps,
        sandboxContent: store.sandboxContent,
        sandboxAccent: store.sandboxAccent,
        videoUrl: store.videoUrl,
        modelId: store.selectedModel,
        contentMode: "video", // Video just ended — still showing last frame
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
          // Add only the tutor's follow-up — no student message (system trigger)
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
      console.error("[useTutorBrain] Video-ended error:", err);
      await optionsRef.current
        .speak(
          "So, what did you notice in that animation? What was happening to the function?"
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

  // ─── Silence handler — auto-continue when student is quiet ──────────────
  // Escalation levels: 1 = rephrase, 2 = scaffold, 3+ = ask what's confusing
  const handleSilence = useCallback(async (level: number) => {
    const store = useSessionStore.getState();

    // Don't trigger if already processing another request
    if (abortRef.current) return;

    setIsProcessing(true);
    setIsThinking(true);

    const controller = new AbortController();
    abortRef.current = controller;

    // Build level-specific silence message so the model knows what to try
    let silenceMessage: string;
    if (level === 1) {
      silenceMessage = `[STUDENT_SILENT level=1 — The student hasn't spoken for 8 seconds. Follow the HANDLING SILENCE rules in your instructions. If you just demonstrated something on the board, silence is normal — advance to guided practice. If you already asked a question, rephrase it more simply.]`;
    } else if (level === 2) {
      silenceMessage = `[STUDENT_SILENT level=2 — The student hasn't spoken for 16 seconds. You ALREADY responded to their silence once (see your previous message). Do NOT repeat what you just said. Try something DIFFERENT: break the problem into smaller pieces, offer a scaffold, or model the first step yourself. If you call tools, you MUST also generate speech text.]`;
    } else {
      silenceMessage = `[STUDENT_SILENT level=${level} — The student hasn't spoken for ${level * 8} seconds. You've tried ${level - 1} times and they still haven't responded. CHANGE YOUR APPROACH COMPLETELY: ask directly "hey, what part is tripping you up?" or "is everything making sense so far?" or try explaining the concept from a totally different angle. Do NOT repeat any previous transition or explanation.]`;
    }

    try {
      const request: TutorBrainRequest = {
        studentMessage: silenceMessage,
        conversationHistory: store.conversationHistory,
        learningPlan: store.learningPlan,
        studentProfile: store.studentProfile ?? {
          name: "Student",
          age: 12,
          grade: 7,
        },
        canvasState: "",
        contentSteps: store.contentSteps,
        sandboxContent: store.sandboxContent,
        sandboxAccent: store.sandboxAccent,
        videoUrl: store.videoUrl,
        modelId: store.selectedModel,
        contentMode: store.contentMode,
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
          // Add only tutor's response — no student message (system trigger)
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
      console.error("[useTutorBrain] Silence handler error:", err);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setIsProcessing(false);
      setIsThinking(false);
    }
  }, []);

  return { isProcessing, isThinking, handleStudentMessage, sendGreeting, handleVideoEnded, handleSilence };
}
