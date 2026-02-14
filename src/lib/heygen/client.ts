// HeyGen avatar module — SDK wrapper
// Wraps @heygen/streaming-avatar. No HeyGen types leak outside.
// See: specs/001-minerva-mvp/contracts/avatar.md

import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
} from "@heygen/streaming-avatar";
import type { AvatarClient, AvatarStatus } from "./types";

export type { AvatarClient, AvatarStatus };

export function createAvatarClient(): AvatarClient {
  let avatar: StreamingAvatar | null = null;
  let mediaStream: MediaStream | null = null;

  const userMessageCallbacks: ((text: string) => void)[] = [];
  const statusChangeCallbacks: ((status: AvatarStatus) => void)[] = [];

  function notifyStatus(status: AvatarStatus) {
    statusChangeCallbacks.forEach((cb) => cb(status));
  }

  return {
    async startSession() {
      notifyStatus("connecting");

      // Fetch one-time access token from our server
      const tokenRes = await fetch("/api/heygen/token", { method: "POST" });
      if (!tokenRes.ok) {
        notifyStatus("disconnected");
        throw new Error("Failed to fetch HeyGen access token");
      }
      const { data } = await tokenRes.json();
      const token: string = data.token;

      avatar = new StreamingAvatar({ token });

      // Register event listeners BEFORE starting session
      // Event data is in event.detail (CustomEvent pattern)
      avatar.on(StreamingEvents.STREAM_READY, (event: CustomEvent) => {
        mediaStream = event.detail as MediaStream;
        notifyStatus("connected");
      });

      avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        notifyStatus("disconnected");
      });

      avatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
        notifyStatus("speaking");
      });

      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        notifyStatus("listening");
      });

      avatar.on(StreamingEvents.USER_END_MESSAGE, (event: CustomEvent) => {
        const message = event.detail?.message as string | undefined;
        if (message) {
          userMessageCallbacks.forEach((cb) => cb(message));
        }
      });

      // Start avatar session
      await avatar.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: "default",
        language: "en",
      });

      // Start voice chat (enables STT + mic access)
      await avatar.startVoiceChat({ isInputAudioMuted: false });

      // Return stream if already ready, otherwise poll
      if (mediaStream) {
        return { stream: mediaStream };
      }

      return new Promise<{ stream: MediaStream }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timed out waiting for avatar stream"));
        }, 15000);

        const check = setInterval(() => {
          if (mediaStream) {
            clearTimeout(timeout);
            clearInterval(check);
            resolve({ stream: mediaStream });
          }
        }, 100);
      });
    },

    async endSession() {
      if (avatar) {
        await avatar.stopAvatar();
        avatar = null;
        mediaStream = null;
        notifyStatus("disconnected");
      }
    },

    async speak(text: string) {
      if (!avatar) return;
      await avatar.speak({ text, task_type: TaskType.REPEAT });
    },

    async interrupt() {
      if (!avatar) return;
      await avatar.interrupt();
    },

    onUserMessage(callback) {
      userMessageCallbacks.push(callback);
    },

    onStatusChange(callback) {
      statusChangeCallbacks.push(callback);
    },
  };
}
