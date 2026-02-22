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
// Delay local audio playback after AVATAR_SPEAK_STARTED to compensate for
// WebRTC video delivery lag. SPEAK_STARTED fires when the server starts
// processing lip-sync, but video frames still need to travel via WebRTC.
// Tune this value: increase if audio leads lips, decrease if lips lead audio.
const AUDIO_SYNC_DELAY_MS = 250;

// ─── Web Audio API — local high-quality playback ──────────────────────────
// We play ElevenLabs audio directly in the browser via Web Audio API for
// full quality, while HeyGen's <video> element stays muted (lip-sync only).

let audioCtx: AudioContext | null = null;
let currentAudioSource: AudioBufferSourceNode | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext({ sampleRate: 24000 });
  }
  return audioCtx;
}

/** Decode Base64 PCM 16-bit 24kHz mono → AudioBuffer for Web Audio API */
function decodePCMToAudioBuffer(pcmBase64: string): AudioBuffer {
  const ctx = getAudioContext();
  const binaryStr = atob(pcmBase64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  const buffer = ctx.createBuffer(1, float32.length, 24000);
  buffer.getChannelData(0).set(float32);
  return buffer;
}

/** Play an AudioBuffer through Web Audio API. Returns the source node for stopping. */
function playAudioBuffer(buffer: AudioBuffer, onEnded?: () => void): AudioBufferSourceNode {
  const ctx = getAudioContext();
  // Resume if suspended (browser autoplay policy)
  if (ctx.state === "suspended") ctx.resume();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  if (onEnded) source.onended = onEnded;
  source.start();
  return source;
}

/** Stop the currently playing local audio source */
function stopLocalAudio() {
  if (currentAudioSource) {
    try { currentAudioSource.stop(); } catch { /* already stopped */ }
    currentAudioSource = null;
  }
}

// ─── Client factory ────────────────────────────────────────────────────────

export function createAvatarClient(): AvatarClient {
  let session: LiveAvatarSession | null = null;
  let pendingElement: HTMLMediaElement | null = null;
  let streamReady = false;

  // Speech state
  let avatarIsSpeaking = false;

  // speakAudio() promise resolution — resolves on AVATAR_SPEAK_ENDED
  let speakResolve: (() => void) | null = null;

  // Dual-track audio: store pending audio buffer to play on AVATAR_SPEAK_STARTED
  let pendingAudioBuffer: AudioBuffer | null = null;

  // PTT mute state — pause local audio during mic recording
  let localAudioMuted = false;

  const statusChangeCallbacks: ((status: AvatarStatus) => void)[] = [];

  function notifyStatus(status: AvatarStatus) {
    statusChangeCallbacks.forEach((cb) => cb(status));
  }

  function tryAttach() {
    if (session && pendingElement && streamReady) {
      session.attach(pendingElement);

      // Dual-track: detach HeyGen's audio track from the element.
      // The SDK attaches both _remoteVideoTrack and _remoteAudioTrack to the element.
      // We only want lip-sync video — audio plays locally via Web Audio API.
      const remoteAudioTrack = (session as unknown as { _remoteAudioTrack: { detach: (el: HTMLMediaElement) => void } | null })._remoteAudioTrack;
      if (remoteAudioTrack && pendingElement) {
        remoteAudioTrack.detach(pendingElement);
        console.log("[AvatarClient] Detached remote audio track — using local Web Audio API playback");
      }
    }
  }

  // Latency tracking
  let cycleStartMs = 0;

  return {
    async startSession() {
      notifyStatus("connecting");

      // Fetch session token from our server (LITE mode)
      // Server-side handles retry with backoff for concurrency limits / 5xx
      const tokenRes = await fetch("/api/heygen/token", { method: "POST" });
      if (!tokenRes.ok) {
        const errData = await tokenRes.json().catch(() => ({ code: "unknown", error: "Network error" }));
        notifyStatus("disconnected");
        const err = new Error(errData.error || "Failed to fetch LiveAvatar session token");
        (err as Error & { code?: string }).code = errData.code;
        (err as Error & { detail?: string }).detail = errData.detail;
        throw err;
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
        stopLocalAudio();
        pendingAudioBuffer = null;
        if (speakResolve) {
          speakResolve();
          speakResolve = null;
        }
        notifyStatus("disconnected");
      });

      // ── Avatar speaking state (from WebSocket events in LITE mode) ──
      // Dual-track: when avatar starts lip-syncing, play ElevenLabs audio locally
      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => {
        const elapsed = cycleStartMs ? (performance.now() - cycleStartMs).toFixed(0) : "?";
        console.log(`[Latency] AVATAR_SPEAK_STARTED +${elapsed}ms | avatar lip-syncing`);
        avatarIsSpeaking = true;
        notifyStatus("speaking");

        // Play stored high-quality audio locally, delayed to sync with WebRTC video
        if (pendingAudioBuffer && !localAudioMuted) {
          const buf = pendingAudioBuffer;
          pendingAudioBuffer = null;
          console.log(`[AvatarClient] Playing local audio in ${AUDIO_SYNC_DELAY_MS}ms (${buf.duration.toFixed(1)}s) — full ElevenLabs quality`);
          setTimeout(() => {
            // Guard: don't play if interrupted or muted during the delay
            if (!avatarIsSpeaking || localAudioMuted) return;
            stopLocalAudio();
            currentAudioSource = playAudioBuffer(buf);
          }, AUDIO_SYNC_DELAY_MS);
        }
      });

      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
        const elapsed = cycleStartMs ? (performance.now() - cycleStartMs).toFixed(0) : "?";
        console.log(`[Latency] AVATAR_SPEAK_ENDED +${elapsed}ms`);
        avatarIsSpeaking = false;
        // Don't force-stop local audio here — let it finish naturally.
        // AVATAR_SPEAK_ENDED can fire early (server-side timing).
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
      stopLocalAudio();
      pendingAudioBuffer = null;
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
      // Close AudioContext to free resources
      if (audioCtx && audioCtx.state !== "closed") {
        audioCtx.close().catch(() => {});
        audioCtx = null;
      }
    },

    // speakAudio() — dual-track audio pipeline:
    // 1. Send Base64 PCM to HeyGen via WebSocket → lip-sync video only (muted)
    // 2. Decode PCM → AudioBuffer → play locally via Web Audio API on SPEAK_STARTED
    //
    // Result: Full ElevenLabs quality audio + synced lip-sync video.
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
        stopLocalAudio();
        await new Promise((r) => setTimeout(r, INTERRUPT_SETTLE_MS));
      }

      avatarIsSpeaking = true;
      notifyStatus("speaking");

      // Decode PCM → AudioBuffer for local playback (triggered on AVATAR_SPEAK_STARTED)
      try {
        pendingAudioBuffer = decodePCMToAudioBuffer(pcmBase64);
      } catch (err) {
        console.warn("[AvatarClient] Failed to decode PCM for local playback:", err);
        pendingAudioBuffer = null;
      }

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
            stopLocalAudio();
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
        stopLocalAudio();
        pendingAudioBuffer = null;
        if (speakResolve) {
          speakResolve();
          speakResolve = null;
        }
        notifyStatus("listening");
      }
    },

    attach(element: HTMLMediaElement) {
      pendingElement = element;
      // Dual-track: video element stays permanently muted (lip-sync video only).
      // Audio is played locally via Web Audio API for full ElevenLabs quality.
      element.muted = true;
      tryAttach();
    },

    // Mute local audio output (used during PTT to prevent echo)
    muteAvatarAudio() {
      localAudioMuted = true;
      stopLocalAudio();
    },

    // Unmute local audio output
    unmuteAvatarAudio() {
      localAudioMuted = false;
    },

    onStatusChange(callback) {
      statusChangeCallbacks.push(callback);
    },
  };
}
