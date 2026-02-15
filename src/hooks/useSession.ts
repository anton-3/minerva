// useSession hook — session state machine
// Manages session lifecycle: idle → connecting → active → ended
// Coordinates: User Camera + LiveAvatar FULL (avatar TTS + ASR) +
// Canvas + Claude brain.
// HeyGen handles both TTS and STT. User camera via native getUserMedia.
//
// Speech audit fixes (Session 7):
// - Wire avatar.interrupt to brain options
// - Bug 9: Use brain.sendGreeting() instead of fake "hi" message

"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { useAvatar } from "./useAvatar";
import { useZoom } from "./useZoom";
import { useCanvas } from "./useCanvas";
import { useTutorBrain } from "./useTutorBrain";
import { useUserCamera } from "./useUserCamera";

export function useSession() {
  // Use individual selectors for stable references — avoids infinite re-render loops
  const status = useSessionStore((s) => s.status);
  const conversationHistory = useSessionStore((s) => s.conversationHistory);
  const contentMode = useSessionStore((s) => s.contentMode);
  const manimVideoUrl = useSessionStore((s) => s.manimVideoUrl);
  const sandboxHtml = useSessionStore((s) => s.sandboxHtml);
  const setStatus = useSessionStore((s) => s.setStatus);
  const setAvatarStatus = useSessionStore((s) => s.setAvatarStatus);
  const setSessionId = useSessionStore((s) => s.setSessionId);
  const setContentMode = useSessionStore((s) => s.setContentMode);
  const setManimVideoUrl = useSessionStore((s) => s.setManimVideoUrl);

  const avatar = useAvatar();
  const zoom = useZoom();
  const canvas = useCanvas();
  const userCamera = useUserCamera();
  const brain = useTutorBrain({
    speak: avatar.speak,
    interrupt: avatar.interrupt,
    executeSequence: canvas.executeSequence,
    getSnapshot: canvas.getSnapshot,
  });

  // Track whether listeners are wired
  const wiredRef = useRef(false);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Wire HeyGen ASR transcriptions → tutor brain
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

      // Start LiveAvatar session FIRST (FULL mode — TTS + ASR via voiceChat)
      await avatar.startSession();

      // Zoom is currently disabled — using native getUserMedia for camera instead
      // TODO: Re-enable Zoom if needed for Education Track
      // zoom
      //   .joinSession(`minerva-${newSessionId.slice(0, 8)}`, "Student")
      //   .then(() => console.log("[useSession] Zoom session joined"))
      //   .catch((err) => console.warn("[useSession] Zoom session failed:", err));

      setStatus("active");

      // Bug 9: Use sendGreeting instead of fake "hi"
      brain.sendGreeting();
    } catch (err) {
      console.error("[useSession] Failed to start session:", err);
      setStatus("error");
    }
  }, [avatar, zoom, setStatus, setSessionId]);

  const endSession = useCallback(async () => {
    try {
      // End sessions in parallel
      await Promise.allSettled([
        avatar.endSession(),
        zoom.leaveSession(),
      ]);

      // Stop user camera
      userCamera.stopCamera();

      // Read latest state directly to avoid stale closures
      const { sessionId, transcript } = useSessionStore.getState();

      if (sessionId) {
        fetch("/api/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: sessionId, status: "completed" }),
        })
          .then(async () => {
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
  }, [avatar, zoom, userCamera, setStatus]);

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
    avatarMute: avatar.mute,
    avatarUnmute: avatar.unmute,
    startSession,
    endSession,
    handleTextMessage: brain.handleStudentMessage,
    // Canvas tools
    toolManager: canvas.toolManager,
    clearCanvas: canvas.clear,
    setActiveTool: canvas.setActiveTool,
    // Content mode
    contentMode,
    manimVideoUrl,
    sandboxHtml,
    setContentMode,
    setManimVideoUrl,
    // User camera
    userCamera,
    // Zoom controls — kept for potential future use
    zoomStatus: zoom.status,
    zoomStartVideo: zoom.startVideo,
    zoomToggleMute: zoom.toggleMute,
    zoomSetMuted: zoom.setMuted,
    zoomIsMuted: zoom.isMuted,
  };
}
