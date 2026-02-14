// LiveAvatar SDK wrapper
// Wraps @heygen/liveavatar-web-sdk. No SDK types leak outside.
// FULL mode WITHOUT context_id: ASR is managed by LiveAvatar, but there's
// no built-in LLM. We use Claude as the brain and repeat() for TTS.

import {
  LiveAvatarSession,
  SessionEvent,
  SessionState,
  AgentEventsEnum,
} from "@heygen/liveavatar-web-sdk";
import type { AvatarClient, AvatarStatus } from "./types";

export type { AvatarClient, AvatarStatus };

export function createAvatarClient(): AvatarClient {
  let session: LiveAvatarSession | null = null;
  let pendingElement: HTMLMediaElement | null = null;
  let streamReady = false;

  // Debounce ASR: accumulate fragments and fire after a pause
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingText = "";
  const DEBOUNCE_MS = 800; // wait 800ms of silence before sending
  let avatarIsSpeaking = false; // Block ASR echo while avatar talks

  const userMessageCallbacks: ((text: string) => void)[] = [];
  const statusChangeCallbacks: ((status: AvatarStatus) => void)[] = [];

  function notifyStatus(status: AvatarStatus) {
    statusChangeCallbacks.forEach((cb) => cb(status));
  }

  function tryAttach() {
    if (session && pendingElement && streamReady) {
      session.attach(pendingElement);
    }
  }

  function flushTranscription() {
    const text = pendingText.trim();
    pendingText = "";
    if (text.length >= 2) {
      userMessageCallbacks.forEach((cb) => cb(text));
    }
  }

  return {
    async startSession() {
      notifyStatus("connecting");

      // Fetch session token from our server
      const tokenRes = await fetch("/api/heygen/token", { method: "POST" });
      if (!tokenRes.ok) {
        notifyStatus("disconnected");
        throw new Error("Failed to fetch LiveAvatar session token");
      }
      const { token } = await tokenRes.json();

      session = new LiveAvatarSession(token, {
        voiceChat: true,
      });

      // Session lifecycle events
      session.on(SessionEvent.SESSION_STATE_CHANGED, (state: SessionState) => {
        switch (state) {
          case SessionState.CONNECTING:
            notifyStatus("connecting");
            break;
          case SessionState.CONNECTED:
            notifyStatus("connected");
            break;
          case SessionState.DISCONNECTED:
            notifyStatus("disconnected");
            break;
        }
      });

      // Stream ready — attach video element
      session.on(SessionEvent.SESSION_STREAM_READY, () => {
        streamReady = true;
        tryAttach();
        notifyStatus("connected");
      });

      // Avatar speaking state — also used to block ASR echo
      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => {
        avatarIsSpeaking = true;
        // Clear any pending ASR text (likely echo from avatar starting to speak)
        if (debounceTimer) clearTimeout(debounceTimer);
        pendingText = "";
        notifyStatus("speaking");
      });

      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
        avatarIsSpeaking = false;
        notifyStatus("listening");
      });

      // User speech transcription — debounce to avoid fragments
      // Block while avatar is speaking to prevent echo
      session.on(AgentEventsEnum.USER_TRANSCRIPTION, (event) => {
        const text = event.text;
        if (!text || avatarIsSpeaking) return;

        // Accumulate fragments and debounce
        pendingText += (pendingText ? " " : "") + text;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(flushTranscription, DEBOUNCE_MS);
      });

      // Connect to LiveKit room
      await session.start();

      // Start voice chat (enables mic + STT)
      try {
        await session.voiceChat.start();
      } catch (err) {
        console.warn("[AvatarClient] Voice chat start failed (mic access?):", err);
      }
    },

    async endSession() {
      if (debounceTimer) clearTimeout(debounceTimer);
      pendingText = "";
      if (session) {
        await session.stop();
        session = null;
        pendingElement = null;
        streamReady = false;
        notifyStatus("disconnected");
      }
    },

    async speak(text: string) {
      if (!session) return;
      session.repeat(text);
    },

    interrupt() {
      if (session) session.interrupt();
    },

    attach(element: HTMLMediaElement) {
      pendingElement = element;
      tryAttach();
    },

    onUserMessage(callback) {
      userMessageCallbacks.push(callback);
    },

    onStatusChange(callback) {
      statusChangeCallbacks.push(callback);
    },
  };
}
