// useTutorBrain hook — conversation loop orchestrator
// Coordinates: student speaks → Claude responds → avatar speaks + canvas draws
// See: specs/001-minerva-mvp/plan.md (Core Session Flow)
//
// Speech audit fixes (Session 7):
// - Bug 2: AbortController — cancel in-flight Claude calls on new message
// - Bug 5: 8s timeout on Claude API call
// - Bug 9: Separate greeting method — no fake "hi" in transcript

"use client";

import { useState, useCallback, useRef } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import type { TutorBrainRequest, TutorBrainResponse } from "@/types/session";


interface UseTutorBrainOptions {
  speak: (text: string) => Promise<void>;
  interrupt: () => void;
  executeSequence: (
    cmds: import("@/types/session").CanvasCommand[],
    delayMs?: number
  ) => Promise<void>;
  getSnapshot: () => string;
}

const API_TIMEOUT_MS = 10000; // 10s timeout — no more sandbox HTML in Call 1, so faster
const VIZ_TIMEOUT_MS = 20000; // 20s timeout for async visualization generation

export function useTutorBrain(options: UseTutorBrainOptions) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isThinking, setIsThinking] = useState(false); // Only true during handleStudentMessage, not greeting
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Bug 2: AbortController to cancel in-flight requests
  const abortRef = useRef<AbortController | null>(null);

  const handleStudentMessage = useCallback(async (message: string, imageData?: TutorBrainRequest["imageData"]) => {
    const store = useSessionStore.getState();

    // Bug 2: abort any in-flight request before starting a new one
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    // Interrupt avatar if it's still speaking (user sent a new message)
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

    // Bug 2: create new AbortController for this request
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Opt 3: skip empty canvas snapshot
      const snapshot = optionsRef.current.getSnapshot();
      const canvasState = snapshot === "Canvas is empty." ? "" : snapshot;

      // Build request
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
        ...(store.masteryScores.length > 0 && { masteryScores: store.masteryScores }),
      };

      // Bug 5: timeout wrapper using AbortSignal.timeout merged with our cancel signal
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      const res = await fetch("/api/tutor/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // If this request was aborted (new message came in), bail
      if (controller.signal.aborted) return;

      const response: TutorBrainResponse = await res.json();

      // Add tutor response to store
      store.addMessage({ role: "assistant", content: response.speech });
      store.addTranscriptEntry({
        speaker: "tutor",
        text: response.speech,
        timestamp: new Date(),
      });

      // Save progress update to Supabase (non-blocking)
      if (response.progressUpdate) {
        const { learningPlan } = store;
        if (learningPlan) {
          fetch("/api/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              child_id: store.sessionId,
              subject: learningPlan.subject,
              topic: response.progressUpdate.topic,
              score: response.progressUpdate.score,
            }),
          }).catch((err) =>
            console.error("[useTutorBrain] Progress save error:", err)
          );
        }
      }

      // Process content mode switch (math/manim — NOT sandbox, which is handled below)
      if (response.contentMode && response.contentMode !== "sandbox") {
        useSessionStore.getState().setContentMode(response.contentMode);
      }
      if (response.manimVideoUrl) {
        useSessionStore.getState().setManimVideoUrl(response.manimVideoUrl);
      }

      // Execute canvas commands (errors here never break the session)
      if (response.canvasCommands && response.canvasCommands.length > 0) {
        optionsRef.current
          .executeSequence(response.canvasCommands)
          .catch((err) => console.error("[useTutorBrain] Canvas error:", err));
      }

      // Two-phase visualization: if Claude returned a visualizationPlan,
      // fire an async request to generate the HTML while the avatar speaks.
      if (response.visualizationPlan) {
        useSessionStore.getState().setSandboxLoading(true);
        useSessionStore.getState().setContentMode("sandbox");

        const vizTimeoutId = setTimeout(() => controller.abort(), VIZ_TIMEOUT_MS);

        fetch("/api/tutor/visualize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: response.visualizationPlan }),
          signal: controller.signal,
        })
          .then((r) => r.json())
          .then(({ sandboxHtml }) => {
            clearTimeout(vizTimeoutId);
            if (sandboxHtml && !controller.signal.aborted) {
              useSessionStore.getState().setSandboxHtml(sandboxHtml);
            }
          })
          .catch((err) => {
            clearTimeout(vizTimeoutId);
            if (err instanceof DOMException && err.name === "AbortError") return;
            console.error("[useTutorBrain] Visualization error:", err);
          })
          .finally(() => {
            useSessionStore.getState().setSandboxLoading(false);
          });
      }

      // Speak the response immediately — don't wait for visualization
      await optionsRef.current.speak(response.speech);
    } catch (err) {
      // Don't log abort errors — they're expected (Bug 2)
      if (err instanceof DOMException && err.name === "AbortError") {
        console.log("[useTutorBrain] Request aborted (new message or timeout)");
        return;
      }
      console.error("[useTutorBrain] Error:", err);
      await optionsRef.current
        .speak("I'm having a little trouble. Can you try that again?")
        .catch(console.error);
    } finally {
      // Only clear processing if this controller wasn't replaced
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setIsProcessing(false);
    }
  }, []);

  // Bug 9: separate greeting method — doesn't add fake "hi" to transcript
  const sendGreeting = useCallback(async () => {
    const store = useSessionStore.getState();

    setIsProcessing(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const request: TutorBrainRequest = {
        studentMessage: "[Session started — greet the student warmly and ask what they'd like to learn today]",
        conversationHistory: [],
        learningPlan: store.learningPlan,
        studentProfile: store.studentProfile ?? {
          name: "Student",
          age: 12,
          grade: 7,
        },
        canvasState: "",
      };

      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      const res = await fetch("/api/tutor/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (controller.signal.aborted) return;

      const response: TutorBrainResponse = await res.json();

      // Only add the tutor's greeting to history (no fake student message)
      store.addMessage({ role: "assistant", content: response.speech });
      store.addTranscriptEntry({
        speaker: "tutor",
        text: response.speech,
        timestamp: new Date(),
      });

      await optionsRef.current.speak(response.speech);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[useTutorBrain] Greeting error:", err);
      await optionsRef.current
        .speak("Hello! I'm Minerva, your AI tutor. What would you like to learn today?")
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
