// useSession hook — session state machine
// Manages session lifecycle: idle → connecting → active → ended
// Coordinates: Zoom Video SDK (call layer) + LiveAvatar LITE (avatar TTS) +
// Browser Web Speech API (STT) + Canvas + Claude brain.
// Zoom is optional — session works with just HeyGen if no Zoom keys configured.

"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { useAvatar } from "./useAvatar";
import { useZoom } from "./useZoom";
import { useCanvas } from "./useCanvas";
import { useTutorBrain } from "./useTutorBrain";
import { useSpeechRecognition } from "./useSpeechRecognition";

export function useSession() {
  // Use individual selectors for stable references — avoids infinite re-render loops
  const status = useSessionStore((s) => s.status);
  const conversationHistory = useSessionStore((s) => s.conversationHistory);
  const setStatus = useSessionStore((s) => s.setStatus);
  const setAvatarStatus = useSessionStore((s) => s.setAvatarStatus);
  const setSessionId = useSessionStore((s) => s.setSessionId);

  const avatar = useAvatar();
  const zoom = useZoom();
  const canvas = useCanvas();
  const stt = useSpeechRecognition();
  const brain = useTutorBrain({
    speak: avatar.speak,
    executeSequence: canvas.executeSequence,
    getSnapshot: canvas.getSnapshot,
  });

  // Track whether listeners are wired
  const wiredRef = useRef(false);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Wire browser STT results → tutor brain
  // Wire avatar speaking state → pause/resume STT (echo prevention)
  useEffect(() => {
    if (!wiredRef.current) {
      stt.onResult((text) => {
        brain.handleStudentMessage(text);
      });
      avatar.onSpeakingChange((isSpeaking) => {
        if (isSpeaking) {
          stt.pause();
        } else {
          stt.resume();
        }
      });
      wiredRef.current = true;
    }
  }, [stt, avatar, brain]);

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

      // Start Zoom Video SDK session (optional — for Zoom Education Track prize)
      // Runs in parallel with HeyGen. If Zoom fails (no keys), we continue.
      // Lifecycle: join → startAudio → startVideo (video handled by page component)
      const zoomPromise = zoom
        .joinSession(`minerva-${newSessionId.slice(0, 8)}`, "Student")
        .then(() => {
          console.log("[useSession] Zoom session joined");
          // Note: We intentionally skip zoom.startAudio() here.
          // Zoom audio would grab the mic exclusively, blocking Web Speech API (our STT).
          // Zoom is only used for student self-view video — audio goes through HeyGen + Web Speech API.
        })
        .catch((err) => {
          console.warn("[useSession] Zoom session failed (non-blocking):", err);
        });

      // Start LiveAvatar session (LITE mode — TTS/avatar rendering only)
      await avatar.startSession();

      // Start browser speech recognition (free, zero-latency)
      stt.start();

      // Wait for Zoom to finish connecting (but don't block if it failed)
      await zoomPromise;

      setStatus("active");

      // Send initial greeting through Claude
      brain.handleStudentMessage("hi");
    } catch (err) {
      console.error("[useSession] Failed to start session:", err);
      setStatus("error");
    }
  }, [avatar, zoom, stt, setStatus, setSessionId]);

  const endSession = useCallback(async () => {
    try {
      // Stop browser STT
      stt.stop();

      // End both sessions in parallel
      await Promise.allSettled([
        avatar.endSession(),
        zoom.leaveSession(),
      ]);

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
  }, [avatar, zoom, stt, setStatus]);

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
    isListening: stt.isListening,
    conversationHistory,
    attach: avatar.attach,
    startSession,
    endSession,
    handleTextMessage: brain.handleStudentMessage,
    setEditor: canvas.setEditor,
    clearCanvas: canvas.clear,
    // Zoom controls — exposed for UI
    zoomStatus: zoom.status,
    zoomStartVideo: zoom.startVideo,
    zoomToggleMute: zoom.toggleMute,
    zoomIsMuted: zoom.isMuted,
  };
}
