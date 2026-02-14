// useSession hook — session state machine
// Manages session lifecycle: idle → connecting → active → ended
// Coordinates Zoom (primary call), HeyGen avatar, canvas, and tutor brain.
// See: specs/001-minerva-mvp/plan.md

"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { useAvatar } from "./useAvatar";
import { useCanvas } from "./useCanvas";
import { useTutorBrain } from "./useTutorBrain";
import { useZoom } from "./useZoom";

export function useSession() {
  const store = useSessionStore();
  const avatar = useAvatar();
  const canvas = useCanvas();
  const zoom = useZoom();
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
    store.setAvatarStatus(avatar.status);
  }, [avatar.status, store]);

  const endSessionRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const startSession = useCallback(async () => {
    try {
      store.setStatus("connecting");

      const sessionId = crypto.randomUUID();
      store.setSessionId(sessionId);

      // Start Zoom session and HeyGen avatar in parallel
      await Promise.all([
        zoom.joinSession(`minerva-${sessionId}`, "Student"),
        avatar.startSession(),
      ]);

      // Start Zoom audio (mic + speaker) after joining
      await zoom.startAudio();

      store.setStatus("active");
    } catch (err) {
      console.error("[useSession] Failed to start session:", err);
      store.setStatus("error");
    }
  }, [avatar, zoom, store]);

  const endSession = useCallback(async () => {
    try {
      // End both Zoom and HeyGen in parallel
      await Promise.all([
        zoom.leaveSession(),
        avatar.endSession(),
      ]);

      // Post-session: save transcript + generate summary (non-blocking)
      if (store.sessionId) {
        const sessionId = store.sessionId;
        const transcript = store.transcript;

        // 1. Mark session as completed
        fetch("/api/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: sessionId, status: "completed" }),
        })
          .then(async () => {
            // 2. Generate summary with inline transcript (saves transcript + generates summary)
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

      store.setStatus("ended");
    } catch (err) {
      console.error("[useSession] Error ending session:", err);
      store.setStatus("ended");
    }
  }, [avatar, zoom, store]);

  // Keep endSessionRef in sync so the timer can call it
  endSessionRef.current = endSession;

  // Auto-end session at 9.5 minutes (before HeyGen's 10-min limit)
  useEffect(() => {
    if (store.status === "active") {
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
  }, [store.status]);

  return {
    // State
    status: store.status,
    avatarStatus: avatar.status,
    stream: avatar.stream,
    isProcessing: brain.isProcessing,
    conversationHistory: store.conversationHistory,
    // Zoom
    zoomStatus: zoom.status,
    isMuted: zoom.isMuted,
    toggleMute: zoom.toggleMute,
    startZoomVideo: zoom.startVideo,
    // Actions
    startSession,
    endSession,
    handleTextMessage: brain.handleStudentMessage,
    // Canvas
    setEditor: canvas.setEditor,
    clearCanvas: canvas.clear,
  };
}
