// useTutorBrain hook — conversation loop orchestrator
// Coordinates: student speaks → Claude responds → avatar speaks + canvas draws
// See: specs/001-minerva-mvp/plan.md (Core Session Flow)

"use client";

import { useState, useCallback, useRef } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import type { TutorBrainRequest, TutorBrainResponse } from "@/types/session";

interface UseTutorBrainOptions {
  speak: (text: string) => Promise<void>;
  executeSequence: (
    cmds: import("@/types/session").CanvasCommand[],
    delayMs?: number
  ) => Promise<void>;
  getSnapshot: () => string;
}

export function useTutorBrain(options: UseTutorBrainOptions) {
  const [isProcessing, setIsProcessing] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const handleStudentMessage = useCallback(async (message: string) => {
    const store = useSessionStore.getState();
    setIsProcessing(true);

    // Add student message to store
    store.addMessage({ role: "user", content: message });
    store.addTranscriptEntry({
      speaker: "student",
      text: message,
      timestamp: new Date(),
    });

    try {
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
        canvasState: optionsRef.current.getSnapshot(),
      };

      // Call tutor API
      const res = await fetch("/api/tutor/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

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
              child_id: store.sessionId, // session tracks the child
              subject: learningPlan.subject,
              topic: response.progressUpdate.topic,
              score: response.progressUpdate.score,
            }),
          }).catch((err) =>
            console.error("[useTutorBrain] Progress save error:", err)
          );
        }
      }

      // Execute canvas commands (errors here never break the session)
      if (response.canvasCommands && response.canvasCommands.length > 0) {
        optionsRef.current
          .executeSequence(response.canvasCommands)
          .catch((err) => console.error("[useTutorBrain] Canvas error:", err));
      }

      // Speak the response (this is the critical path)
      await optionsRef.current.speak(response.speech);
    } catch (err) {
      console.error("[useTutorBrain] Error:", err);
      // Graceful fallback — speak error message
      await optionsRef.current
        .speak("I'm having a little trouble. Can you try that again?")
        .catch(console.error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { isProcessing, handleStudentMessage };
}
