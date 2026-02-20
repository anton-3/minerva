// useSession hook — session state machine
// Manages session lifecycle: idle → connecting → active → ended
// Coordinates: User Camera + LiveAvatar LITE (lip-sync only) +
// Deepgram ASR + ElevenLabs TTS (server-side) + Canvas + Claude brain.
//
// LITE mode pipeline:
// User speaks → Deepgram ASR → handleStudentMessage → Claude → ElevenLabs TTS →
// PCM audio → avatar lip-sync via repeatAudio()

"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { useAvatar } from "./useAvatar";
import { useZoom } from "./useZoom";
import { useCanvas } from "./useCanvas";
import { useTutorBrain } from "./useTutorBrain";
import { useUserCamera } from "./useUserCamera";
import { createASRClient, ASRClient } from "@/lib/deepgram/client";
import { captureFrame } from "@/lib/camera/scanner";

export function useSession() {
// Use individual selectors for stable references — avoids infinite re-render loops
  const status = useSessionStore((s) => s.status);
  const conversationHistory = useSessionStore((s) => s.conversationHistory);
  const contentMode = useSessionStore((s) => s.contentMode);
  const sandboxContent = useSessionStore((s) => s.sandboxContent);
  const sandboxAccent = useSessionStore((s) => s.sandboxAccent);
  const videoUrl = useSessionStore((s) => s.videoUrl);
  const setStatus = useSessionStore((s) => s.setStatus);
  const setAvatarStatus = useSessionStore((s) => s.setAvatarStatus);
  const setSessionId = useSessionStore((s) => s.setSessionId);
  const setContentMode = useSessionStore((s) => s.setContentMode);
  const avatar = useAvatar();
  const zoom = useZoom();
  const canvas = useCanvas();
  const userCamera = useUserCamera();
  const brain = useTutorBrain({
    speak: avatar.speak,
    speakAudio: avatar.speakAudio,
    interrupt: avatar.interrupt,
    executeSequence: canvas.executeSequence,
    getSnapshot: canvas.getSnapshot,
  });

  // Deepgram ASR client ref
  const asrRef = useRef<ASRClient | null>(null);

  // Track whether Deepgram transcript listener is wired
  const wiredRef = useRef(false);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Accumulate final transcripts until push-to-talk is released
  const pendingTranscriptRef = useRef("");

  // Generation counter — prevents cross-PTT transcript leakage.
  // Each startListening() increments this. Only finals matching the current generation
  // are accumulated. 0 = not listening (reject all stale finals).
  const listenGenRef = useRef(0);

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

      // Create and connect Deepgram ASR client
      const asr = createASRClient();
      asrRef.current = asr;
      wiredRef.current = false; // Reset wiring flag for new ASR client

      // Start LiveAvatar LITE session + Deepgram ASR in parallel
      await Promise.all([
        avatar.startSession(),
        asr.connect(),
      ]);

      // Wire ASR transcript listener after connect.
      // Uses generation counter to reject stale finals from previous PTT sessions.
      asr.onTranscript((text, isFinal) => {
        if (!isFinal) return;
        // Only accept transcripts during an active PTT session (gen > 0)
        if (listenGenRef.current === 0) {
          console.log(`[useSession] Ignoring stale final transcript: "${text}"`);
          return;
        }
        pendingTranscriptRef.current += (pendingTranscriptRef.current ? " " : "") + text;
        console.log(`[useSession] Accumulated transcript (gen ${listenGenRef.current}): "${pendingTranscriptRef.current}"`);
      });
      wiredRef.current = true;

      setStatus("active");

      // Send greeting — avatar speaks via ElevenLabs TTS → repeatAudio()
      brain.sendGreeting();
    } catch (err) {
      console.error("[useSession] Failed to start session:", err);
      setStatus("error");
    }
  }, [avatar, setStatus, setSessionId, brain]);

  const endSession = useCallback(async () => {
    try {
      // End sessions in parallel
      await Promise.allSettled([
        avatar.endSession(),
        zoom.leaveSession(),
      ]);

      // Disconnect Deepgram ASR
      if (asrRef.current) {
        asrRef.current.disconnect();
        asrRef.current = null;
      }

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

  // ─── Push-to-talk handlers (called from session page) ─────────────────
  const startListening = useCallback(() => {
    if (asrRef.current) {
      // Interrupt avatar if speaking (barge-in)
      avatar.interrupt();

      // New generation — any stale finals from previous PTT will be rejected
      listenGenRef.current++;
      pendingTranscriptRef.current = "";

      asrRef.current.startListening();
      console.log(`[useSession] PTT started (gen ${listenGenRef.current})`);
    }
  }, [avatar]);

  const stopListening = useCallback(() => {
    if (asrRef.current) {
      const capturedGen = listenGenRef.current;
      asrRef.current.stopListening();

      // Grace period: 300ms audio flush + Finalize + network round-trip
      // Deepgram Finalize forces immediate final transcript (no silence wait)
      setTimeout(() => {
        // If a new PTT session started, discard this one
        if (listenGenRef.current !== capturedGen) {
          console.log(`[useSession] Discarding gen ${capturedGen} transcript — new PTT started`);
          return;
        }

        // Close the generation — reject any more stale finals
        listenGenRef.current = 0;

        const transcript = pendingTranscriptRef.current.trim();
        pendingTranscriptRef.current = "";

        console.log(`[useSession] PTT ended (gen ${capturedGen}): "${transcript}"`);

        if (transcript.length === 0) return;

        // Check if user said "read" for camera screenshot
        const includeScreenshot =
          transcript.toLowerCase().includes("read") &&
          userCamera.videoRef.current;

        if (includeScreenshot) {
          const result = captureFrame(userCamera.videoRef.current!);
          if (result) {
            brain.handleStudentMessage(transcript, result);
            return;
          }
        }

        brain.handleStudentMessage(transcript);
      }, 800);
    }
  }, [brain, userCamera.videoRef]);

  return {
    status,
    avatarStatus: avatar.status,
    isProcessing: brain.isProcessing,
    isThinking: brain.isThinking,
    conversationHistory,
    attach: avatar.attach,
    muteAvatarAudio: avatar.muteAvatarAudio,
    unmuteAvatarAudio: avatar.unmuteAvatarAudio,
    startSession,
    endSession,
    handleTextMessage: brain.handleStudentMessage,
    // Push-to-talk (Deepgram ASR)
    startListening,
    stopListening,
    // Canvas tools
    toolManager: canvas.toolManager,
    clearCanvas: canvas.clear,
    setActiveTool: canvas.setActiveTool,
    // Content mode
    contentMode,
    sandboxContent,
    sandboxAccent,
    videoUrl,
    setContentMode,
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
