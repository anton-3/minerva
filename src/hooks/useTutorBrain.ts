// useTutorBrain hook — conversation loop orchestrator
// Coordinates: student speaks → Claude responds (SSE stream) → avatar speaks + canvas draws
// See: specs/001-minerva-mvp/plan.md (Core Session Flow)
//
// SSE streaming pipeline (Session 11):
// The API returns an SSE stream. Speech is emitted first (~1s) so the avatar
// starts talking immediately. Remaining fields (sandboxHtml, canvasCommands, etc.)
// arrive in a second event when the stream finishes.
//
// Speech audit fixes preserved:
// - AbortController — cancel in-flight requests on new message
// - Timeout on API call
// - Separate greeting method — no fake "hi" in transcript

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

const API_TIMEOUT_MS = 30000; // 30s — SSE streams can take longer for sandbox HTML generation

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
  // Used by both handleStudentMessage and sendGreeting.
  // Reads SSE events from the response body, processes speech immediately,
  // and handles result/error events.
  async function consumeStream(
    res: Response,
    controller: AbortController,
    opts: {
      onSpeech: (speech: string) => void;
      timeoutId: ReturnType<typeof setTimeout>;
    }
  ): Promise<void> {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = "";
    let speechHandled = false;
    let speakPromise: Promise<void> | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (controller.signal.aborted) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const { events, remaining } = parseSSEBuffer(sseBuffer);
        sseBuffer = remaining;

        for (const event of events) {
          // ── Speech event: emitted early, start avatar speaking immediately ──
          if (event.type === "speech" && !speechHandled) {
            speechHandled = true;
            clearTimeout(opts.timeoutId); // connection alive, speech received
            setIsThinking(false);

            const speech = event.speech as string;
            opts.onSpeech(speech);
            // Fire speak — don't await, let result events process while avatar talks
            speakPromise = optionsRef.current.speak(speech);
          }

          // ── Result event: remaining fields (sandbox, canvas, progress, etc.) ──
          if (event.type === "result") {
            const data = event.data as Record<string, unknown>;
            const store = useSessionStore.getState();

            if (data.contentMode) {
              store.setContentMode(data.contentMode as ContentMode);
            }
            if (data.manimVideoUrl) {
              store.setManimVideoUrl(data.manimVideoUrl as string);
            }
            if (data.sandboxHtml) {
              store.setSandboxHtml(data.sandboxHtml as string);
            }
            if (
              data.canvasCommands &&
              Array.isArray(data.canvasCommands) &&
              data.canvasCommands.length > 0
            ) {
              optionsRef.current
                .executeSequence(data.canvasCommands as CanvasCommand[])
                .catch((err) =>
                  console.error("[useTutorBrain] Canvas error:", err)
                );
            }
            // Save progress update to Supabase (non-blocking)
            if (data.progressUpdate) {
              const progress = data.progressUpdate as {
                topic: string;
                score: number;
              };
              const { learningPlan, sessionId } = store;
              if (learningPlan) {
                fetch("/api/progress", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    child_id: sessionId,
                    subject: learningPlan.subject,
                    topic: progress.topic,
                    score: progress.score,
                  }),
                }).catch((err) =>
                  console.error("[useTutorBrain] Progress save error:", err)
                );
              }
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

        const request: TutorBrainRequest = {
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
