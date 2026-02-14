// useSession hook — session state machine
// Manages session lifecycle: idle → connecting → active → ended
// Coordinates LiveAvatar avatar, canvas, and tutor brain.

"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { useAvatar } from "./useAvatar";
import { useCanvas } from "./useCanvas";
import { useTutorBrain } from "./useTutorBrain";

export function useSession() {
  // Use individual selectors for stable references — avoids infinite re-render loops
  const status = useSessionStore((s) => s.status);
  const conversationHistory = useSessionStore((s) => s.conversationHistory);
  const setStatus = useSessionStore((s) => s.setStatus);
  const setAvatarStatus = useSessionStore((s) => s.setAvatarStatus);
  const setSessionId = useSessionStore((s) => s.setSessionId);

  const avatar = useAvatar();
  const canvas = useCanvas();
  const brain = useTutorBrain({
    speak: avatar.speak,
    executeSequence: canvas.executeSequence,
    getSnapshot: canvas.getSnapshot,
  });

  // Track whether user message listener is wired
  const wiredRef = useRef(false);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Wire avatar user messages to tutor brain
  useEffect(() => {
    if (!wiredRef.current) {
      avatar.onUserMessage((text) => {
        brain.handleStudentMessage(text);
      });
      wiredRef.current = true;
    }
  }, [avatar, brain]);

  // Track avatar status in store
  useEffect(() => {
    setAvatarStatus(avatar.status);
  }, [avatar.status, setAvatarStatus]);

  const endSessionRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const startSession = useCallback(async () => {
    try {
      setStatus("connecting");

      const newSessionId = crypto.randomUUID();
      setSessionId(newSessionId);

      // Start LiveAvatar session (connects to LiveKit room)
      await avatar.startSession();

      setStatus("active");

      // Send initial greeting through Claude (no built-in AI greeting anymore)
      brain.handleStudentMessage("hi");
    } catch (err) {
      console.error("[useSession] Failed to start session:", err);
      setStatus("error");
    }
  }, [avatar, setStatus, setSessionId]);

  const endSession = useCallback(async () => {
    try {
      await avatar.endSession();

      // Read latest state directly to avoid stale closures
      const { sessionId, transcript } = useSessionStore.getState();

      if (sessionId) {
        // 1. Mark session as completed
        fetch("/api/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: sessionId, status: "completed" }),
        })
          .then(async () => {
            // 2. Generate summary with inline transcript
            if (transcript.length > 0) {
              await fetch("/api/session/summary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  session_id: sessionId,
                  transcript: transcript.map((t) => ({
                    speaker: t.speaker,
                    text: t.text,
                  })),
                }),
              });
            }
          })
          .catch((err) =>
            console.error("[useSession] Post-session error:", err)
          );
      }

      setStatus("ended");
    } catch (err) {
      console.error("[useSession] Error ending session:", err);
      setStatus("ended");
    }
  }, [avatar, setStatus]);

  // Keep endSessionRef in sync so the timer can call it
  endSessionRef.current = endSession;

  // Auto-end session at 9.5 minutes (before HeyGen's 10-min limit)
  useEffect(() => {
    if (status === "active") {
      sessionTimerRef.current = setTimeout(() => {
        console.warn("[useSession] Auto-ending session at 9.5 min limit");
        void endSessionRef.current();
      }, 9.5 * 60 * 1000);
    }
    return () => {
      if (sessionTimerRef.current) {
        clearTimeout(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    };
  }, [status]);

  return {
    status,
    avatarStatus: avatar.status,
    isProcessing: brain.isProcessing,
    conversationHistory,
    attach: avatar.attach,
    startSession,
    endSession,
    handleTextMessage: brain.handleStudentMessage,
    setEditor: canvas.setEditor,
    clearCanvas: canvas.clear,
  };
}
