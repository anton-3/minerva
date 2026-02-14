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

      // Mark session as completed in Supabase (non-blocking)
      if (store.sessionId) {
        fetch("/api/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: store.sessionId, status: "completed" }),
        }).catch((err) =>
          console.error("[useSession] Session update error:", err)
        );
      }

      store.setStatus("ended");
    } catch (err) {
      console.error("[useSession] Error ending session:", err);
      store.setStatus("ended");
    }
  }, [avatar, zoom, store]);

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
