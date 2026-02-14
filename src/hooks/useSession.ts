// useSession hook — session state machine
// Manages session lifecycle: idle → connecting → active → ended
// Coordinates avatar, canvas, and tutor brain.
// See: specs/001-minerva-mvp/plan.md

"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { useAvatar } from "./useAvatar";
import { useCanvas } from "./useCanvas";
import { useTutorBrain } from "./useTutorBrain";

export function useSession() {
  const store = useSessionStore();
  const avatar = useAvatar();
  const canvas = useCanvas();
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

      // Start avatar session (fetches token, creates stream)
      await avatar.startSession();

      store.setStatus("active");
      store.setSessionId(crypto.randomUUID());
    } catch (err) {
      console.error("[useSession] Failed to start session:", err);
      store.setStatus("error");
    }
  }, [avatar, store]);

  const endSession = useCallback(async () => {
    try {
      await avatar.endSession();
      store.setStatus("ended");
    } catch (err) {
      console.error("[useSession] Error ending session:", err);
      store.setStatus("ended");
    }
  }, [avatar, store]);

  return {
    // State
    status: store.status,
    avatarStatus: avatar.status,
    stream: avatar.stream,
    isProcessing: brain.isProcessing,
    conversationHistory: store.conversationHistory,
    // Actions
    startSession,
    endSession,
    handleTextMessage: brain.handleStudentMessage,
    // Canvas
    setEditor: canvas.setEditor,
    clearCanvas: canvas.clear,
  };
}
