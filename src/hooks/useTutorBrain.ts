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

const API_TIMEOUT_MS = 5 * 60 * 1000; // 5 minute timeout — Manim video generation can take 60-120+ seconds

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

      if (!res.ok) {
        console.error("[useTutorBrain] API error:", res.status, res.statusText);
        throw new Error(`API returned ${res.status}`);
      }

      const response: TutorBrainResponse = await res.json();
      
      // Debug: log what we received from the API
      console.log("[useTutorBrain] Response received:", {
        contentMode: response.contentMode,
        hasSandboxContent: !!response.sandboxContent,
        sandboxAccent: response.sandboxAccent,
        hasVideoUrl: !!response.videoUrl,
        videoUrl: response.videoUrl,
        manimPrompt: response.manimPrompt,
      });

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

// Store sandbox/manim content FIRST (before switching modes)
      if (response.sandboxContent) {
        useSessionStore.getState().setSandboxContent(response.sandboxContent, response.sandboxAccent);
      }
      if (response.videoUrl) {
        useSessionStore.getState().setVideoUrl(response.videoUrl);
      }

      // Process content mode switch from Claude
      // RULE: Never switch to sandbox unless sandboxContent is present.
      // Never switch to video unless videoUrl is present.
      // Never switch to math unless canvasCommands are present.
      const currentMode = useSessionStore.getState().contentMode;
      const hasCanvas = response.canvasCommands && response.canvasCommands.length > 0;
      const hasSandbox = !!response.sandboxContent;
      const hasVideo = !!response.videoUrl;

      if (response.contentMode) {
        // Only honor the mode switch if matching content exists
        const modeValid =
          (response.contentMode === "sandbox" && hasSandbox) ||
          (response.contentMode === "math" && hasCanvas) ||
          (response.contentMode === "video" && hasVideo) ||
          response.contentMode === "welcome";
        if (modeValid) {
          useSessionStore.getState().setContentMode(response.contentMode);
        }
      } else if (currentMode === "welcome") {
        // Auto-exit welcome: only switch if we actually have content to show
        if (hasSandbox) {
          useSessionStore.getState().setContentMode("sandbox");
        } else if (hasCanvas) {
          useSessionStore.getState().setContentMode("math");
        } else if (hasVideo) {
          useSessionStore.getState().setContentMode("video");
        }
        // If no content, stay on welcome — just a speech-only response
      }

      // Execute canvas commands (errors here never break the session)
      if (response.canvasCommands && response.canvasCommands.length > 0) {
        optionsRef.current
          .executeSequence(response.canvasCommands)
          .catch((err) => console.error("[useTutorBrain] Canvas error:", err));
      }

      // Speak the response — now properly waits for AVATAR_SPEAK_ENDED (Bug 3 fix)
      if (!response.speech) {
        console.error("[useTutorBrain] No speech in response:", response);
        throw new Error("No speech in Claude response");
      }
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
      setIsThinking(false);
    }
  }, []);

  // Bug 9: separate greeting method — doesn't add fake "hi" to transcript
  // Uses LOCAL controller (not abortRef) so ASR-triggered handleStudentMessage
  // can't accidentally abort the greeting fetch.
  // IMPORTANT: Does NOT set isProcessing/isThinking — greeting is a background
  // operation that must not lock the chat UI or block user messages.
  const sendGreeting = useCallback(async () => {
    const store = useSessionStore.getState();

    const controller = new AbortController();

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

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

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
    }
  }, []);

  return { isProcessing, isThinking, handleStudentMessage, sendGreeting };
}
