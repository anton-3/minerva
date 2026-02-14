// LiveAvatar SDK wrapper — LITE mode
// Wraps @heygen/liveavatar-web-sdk. No SDK types leak outside.
// LITE mode: avatar rendering + TTS only. No ASR, no voice chat.
// STT is handled separately by browser Web Speech API (useSpeechRecognition).
// LLM is Claude. This module is just the display layer.

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

  const speakingCallbacks: ((isSpeaking: boolean) => void)[] = [];
  const statusChangeCallbacks: ((status: AvatarStatus) => void)[] = [];

  function notifyStatus(status: AvatarStatus) {
    statusChangeCallbacks.forEach((cb) => cb(status));
  }

  function tryAttach() {
    if (session && pendingElement && streamReady) {
      session.attach(pendingElement);
    }
  }

  return {
    async startSession() {
      notifyStatus("connecting");

      // Fetch session token from our server (LITE mode)
      const tokenRes = await fetch("/api/heygen/token", { method: "POST" });
      if (!tokenRes.ok) {
        notifyStatus("disconnected");
        throw new Error("Failed to fetch LiveAvatar session token");
      }
      const { token } = await tokenRes.json();

      // LITE mode: no voiceChat needed
      session = new LiveAvatarSession(token);

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

      // Avatar speaking state — exposed so browser STT can pause during speech
      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => {
        notifyStatus("speaking");
        speakingCallbacks.forEach((cb) => cb(true));
      });

      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
        notifyStatus("listening");
        speakingCallbacks.forEach((cb) => cb(false));
      });

      // Connect (LITE — no voice chat to start)
      await session.start();
    },

    async endSession() {
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

    onSpeakingChange(callback: (isSpeaking: boolean) => void) {
      speakingCallbacks.push(callback);
    },

    onStatusChange(callback) {
      statusChangeCallbacks.push(callback);
    },
  };
}
