// LiveAvatar SDK wrapper — FULL mode
// Wraps @heygen/liveavatar-web-sdk. No SDK types leak outside.
// FULL mode: avatar rendering + TTS via repeat(text) + ASR via voiceChat.
// HeyGen handles both TTS and STT. LLM is Claude (our brain).
// USER_TRANSCRIPTION events are debounced and routed to the tutor brain.

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

      // FULL mode with voice chat — HeyGen handles both TTS and STT
      session = new LiveAvatarSession(token, { voiceChat: true });

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

      // Avatar speaking state — block ASR echo while avatar talks
      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => {
        console.log("[AvatarClient] AVATAR_SPEAK_STARTED");
        avatarIsSpeaking = true;
        if (debounceTimer) clearTimeout(debounceTimer);
        pendingText = "";
        notifyStatus("speaking");
      });

      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
        console.log("[AvatarClient] AVATAR_SPEAK_ENDED");
        avatarIsSpeaking = false;
        notifyStatus("listening");
      });

      // User speech transcription — debounce to avoid fragments
      // Block while avatar is speaking to prevent echo
      session.on(AgentEventsEnum.USER_TRANSCRIPTION, (event) => {
        const text = event.text;
        console.log("[AvatarClient] USER_TRANSCRIPTION:", text, "avatarIsSpeaking:", avatarIsSpeaking);
        if (!text || avatarIsSpeaking) return;

        // Accumulate fragments and debounce
        pendingText += (pendingText ? " " : "") + text;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(flushTranscription, DEBOUNCE_MS);
      });

      // Connect to LiveKit room
      await session.start();
      console.log("[AvatarClient] Session started, voiceChat state:", session.voiceChat.state);

      // Start voice chat (enables mic + ASR)
      try {
        await session.voiceChat.start();
        console.log("[AvatarClient] Voice chat started, state:", session.voiceChat.state);
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
