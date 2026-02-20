// LiveAvatar SDK wrapper — LITE mode
// Wraps @heygen/liveavatar-web-sdk. No SDK types leak outside.
// LITE mode: avatar rendering + lip-sync only. No HeyGen ASR or TTS.
// Audio sent via repeatAudio() → agent.speak WebSocket events.
// ASR is handled by Deepgram (separate module).
// TTS is handled by ElevenLabs (server-side, audio arrives via SSE).

import {
  LiveAvatarSession,
  SessionEvent,
  SessionState,
  SessionDisconnectReason,
  AgentEventsEnum,
} from "@heygen/liveavatar-web-sdk";
import type { AvatarClient, AvatarStatus } from "./types";

export type { AvatarClient, AvatarStatus };

// ─── Constants ─────────────────────────────────────────────────────────────

const SESSION_START_TIMEOUT_MS = 15000;
const INTERRUPT_SETTLE_MS = 100;

// ─── Client factory ────────────────────────────────────────────────────────

export function createAvatarClient(): AvatarClient {
  let session: LiveAvatarSession | null = null;
  let pendingElement: HTMLMediaElement | null = null;
  let streamReady = false;
  let avatarAudioMuted = false;

  // Speech state
  let avatarIsSpeaking = false;

  // speakAudio() promise resolution — resolves on AVATAR_SPEAK_ENDED
  let speakResolve: (() => void) | null = null;

  const statusChangeCallbacks: ((status: AvatarStatus) => void)[] = [];

  function notifyStatus(status: AvatarStatus) {
    statusChangeCallbacks.forEach((cb) => cb(status));
  }

  function tryAttach() {
    if (session && pendingElement && streamReady) {
      session.attach(pendingElement);
    }
  }

  // Latency tracking
  let cycleStartMs = 0;

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

      // LITE mode — no voiceChat config (mic managed by Deepgram)
      session = new LiveAvatarSession(token, {});

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

      // Session disconnected — surface end reason
      session.on(SessionEvent.SESSION_DISCONNECTED, (reason: SessionDisconnectReason) => {
        console.warn("[AvatarClient] Session disconnected, reason:", reason);
        avatarIsSpeaking = false;
        if (speakResolve) {
          speakResolve();
          speakResolve = null;
        }
        notifyStatus("disconnected");
      });

      // ── Avatar speaking state (from WebSocket events in LITE mode) ──
      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => {
        const elapsed = cycleStartMs ? (performance.now() - cycleStartMs).toFixed(0) : "?";
        console.log(`[Latency] AVATAR_SPEAK_STARTED +${elapsed}ms | avatar lip-syncing`);
        avatarIsSpeaking = true;
        notifyStatus("speaking");
      });

      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
        const elapsed = cycleStartMs ? (performance.now() - cycleStartMs).toFixed(0) : "?";
        console.log(`[Latency] AVATAR_SPEAK_ENDED +${elapsed}ms`);
        avatarIsSpeaking = false;
        notifyStatus("listening");

        // Resolve speakAudio() promise
        if (speakResolve) {
          speakResolve();
          speakResolve = null;
        }
      });

      // Start session with timeout
      await Promise.race([
        session.start(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("LiveAvatar session.start() timed out")),
            SESSION_START_TIMEOUT_MS
          )
        ),
      ]);

      console.log("[AvatarClient] LITE mode session started");
      notifyStatus("listening");
    },

    async endSession() {
      avatarIsSpeaking = false;
      if (speakResolve) {
        speakResolve();
        speakResolve = null;
      }
      if (session) {
        await session.stop();
        session = null;
        pendingElement = null;
        streamReady = false;
        notifyStatus("disconnected");
      }
    },

    // speakAudio() — send pre-generated PCM 24kHz audio to avatar for lip-sync.
    // Accepts Base64-encoded PCM (16-bit, 24kHz, mono).
    //
    // WORKAROUND: SDK v0.0.10 bug — repeatAudio() sends raw binary strings
    // but the HeyGen WebSocket server expects Base64-encoded audio in agent.speak.
    // We bypass the SDK and send directly on the WebSocket with proper Base64 encoding.
    async speakAudio(pcmBase64: string) {
      if (!session) {
        console.warn("[AvatarClient] speakAudio: no session");
        return;
      }

      // Access the internal WebSocket (private field — SDK bug workaround)
      const ws = (session as unknown as { _sessionEventSocket: WebSocket | null })._sessionEventSocket;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn("[AvatarClient] WebSocket not open for speakAudio");
        return;
      }

      cycleStartMs = performance.now();
      console.log(
        `[Latency] SPEAK_AUDIO_CALLED +0ms | sending ${pcmBase64.length} chars Base64 via WebSocket`
      );

      // Interrupt current speech before starting new
      if (avatarIsSpeaking) {
        session.interrupt();
        avatarIsSpeaking = false;
        await new Promise((r) => setTimeout(r, INTERRUPT_SETTLE_MS));
      }

      avatarIsSpeaking = true;
      notifyStatus("speaking");

      return new Promise<void>((resolve) => {
        speakResolve = resolve;

        // Chunk Base64 into ~1-second segments for smooth streaming.
        // 1 second of PCM 24kHz 16-bit mono = 48000 bytes = 64000 Base64 chars.
        // Must chunk on 4-char boundaries (Base64 block size).
        const B64_CHARS_PER_SECOND = Math.ceil(48000 / 3) * 4; // 64000
        const eventId = crypto.randomUUID();
        let chunkCount = 0;

        for (let i = 0; i < pcmBase64.length; i += B64_CHARS_PER_SECOND) {
          const chunk = pcmBase64.slice(i, i + B64_CHARS_PER_SECOND);
          ws.send(JSON.stringify({
            type: "agent.speak",
            event_id: eventId,
            audio: chunk,
          }));
          chunkCount++;
        }

        // Signal end of audio
        ws.send(JSON.stringify({
          type: "agent.speak_end",
          event_id: eventId,
        }));

        console.log(
          `[AvatarClient] Sent ${chunkCount} Base64 chunks + speak_end via WebSocket`
        );

        // Safety timeout if AVATAR_SPEAK_ENDED never fires
        // Estimate duration from Base64 length: b64 chars × 3/4 = bytes, ÷ 48000 = seconds
        const pcmBytes = (pcmBase64.length * 3) / 4;
        const estimatedMs = (pcmBytes / 48000) * 1000 + 5000;
        setTimeout(() => {
          if (speakResolve === resolve) {
            console.warn("[AvatarClient] speakAudio() safety timeout after", Math.round(estimatedMs), "ms");
            avatarIsSpeaking = false;
            notifyStatus("listening");
            speakResolve = null;
            resolve();
          }
        }, estimatedMs);
      });
    },

    // speak() — text-only, for display/logging. Does NOT generate TTS.
    // In LITE mode, TTS is handled server-side by ElevenLabs.
    // This method is kept for backward compatibility with chat display.
    async speak(text: string) {
      if (!session) return;
      // In LITE mode, repeat(text) sends avatar.speak_text via WebSocket.
      // HeyGen LITE may or may not handle this (server TTS is not guaranteed).
      // If it does, great. If not, speakAudio() is the primary method.
      console.log("[AvatarClient] speak(text) called — forwarding to repeat():", text.slice(0, 60));
      session.repeat(text);
    },

    interrupt() {
      if (session) {
        session.interrupt();
        avatarIsSpeaking = false;
        if (speakResolve) {
          speakResolve();
          speakResolve = null;
        }
        notifyStatus("listening");
      }
    },

    attach(element: HTMLMediaElement) {
      pendingElement = element;
      element.muted = avatarAudioMuted;
      tryAttach();
    },

    muteAvatarAudio() {
      avatarAudioMuted = true;
      if (pendingElement) pendingElement.muted = true;
    },

    unmuteAvatarAudio() {
      avatarAudioMuted = false;
      if (pendingElement) pendingElement.muted = false;
    },

    onStatusChange(callback) {
      statusChangeCallbacks.push(callback);
    },
  };
}
