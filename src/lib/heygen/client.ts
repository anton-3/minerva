// LiveAvatar SDK wrapper — FULL mode
// Wraps @heygen/liveavatar-web-sdk. No SDK types leak outside.
// FULL mode: avatar rendering + TTS via repeat(text) + ASR via voiceChat.
// HeyGen handles both TTS and STT. LLM is Claude (our brain).
// USER_TRANSCRIPTION events are debounced and routed to the tutor brain.
//
// Speech pipeline (Session 8 v2 — modeled after ElevenLabs/OpenAI/Vapi):
// Layer 1: Browser WebRTC AEC3 (echoCancellation:true via HeyGen SDK)
// Layer 2: Echo detection via n-gram matching against recent avatar speech
// Layer 3: Backchannel classification (don't interrupt for "yeah", "uh-huh")
// Layer 4: Noise-only filter (pure filler with no content)
// Layer 5: Adaptive debounce (longer wait when student might be thinking)

import {
  LiveAvatarSession,
  SessionEvent,
  SessionState,
  AgentEventsEnum,
} from "@heygen/liveavatar-web-sdk";
import type { AvatarClient, AvatarStatus } from "./types";

export type { AvatarClient, AvatarStatus };

// ─── Echo detection (industry-grade: n-gram matching) ──────────────────────
// Instead of Jaccard similarity on the full text (fragile — "photosynthesis"
// in both tutor and student triggers false positive), we use n-gram substring
// matching. If a user phrase is a SUBSTRING of what the avatar recently said,
// it's likely echo. If it contains novel words not in avatar speech, it's real.

/** Sliding window of recent avatar speech (last 3 utterances) */
const AVATAR_SPEECH_HISTORY: string[] = [];
const MAX_SPEECH_HISTORY = 3;

function addToSpeechHistory(text: string) {
  AVATAR_SPEECH_HISTORY.push(text.toLowerCase());
  if (AVATAR_SPEECH_HISTORY.length > MAX_SPEECH_HISTORY) {
    AVATAR_SPEECH_HISTORY.shift();
  }
}

function clearSpeechHistory() {
  AVATAR_SPEECH_HISTORY.length = 0;
}

/**
 * Check if user text is likely echo of avatar speech.
 * Strategy: extract user's content words, check what % appear in recent
 * avatar speech. If >70% of user's content words are in avatar speech,
 * it's echo. Content words exclude common function words.
 */
const FUNCTION_WORDS = new Set([
  "i", "me", "my", "you", "your", "we", "they", "he", "she", "it",
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "can", "may", "might", "shall", "to", "of", "in", "for",
  "on", "with", "at", "by", "from", "as", "into", "about", "but",
  "and", "or", "not", "so", "if", "then", "than", "that", "this",
  "what", "which", "who", "how", "when", "where", "why",
]);

function isLikelyEcho(userText: string): boolean {
  if (AVATAR_SPEECH_HISTORY.length === 0) return false;

  const recentAvatarSpeech = AVATAR_SPEECH_HISTORY.join(" ");
  const avatarWords = new Set(recentAvatarSpeech.split(/\s+/).filter(Boolean));

  // Extract content words from user text (skip function words)
  const userWords = userText.toLowerCase().split(/\s+/).filter(Boolean);
  const contentWords = userWords.filter((w) => !FUNCTION_WORDS.has(w));

  // If user said only function words (very short), check if entire phrase
  // appears as substring in avatar speech
  if (contentWords.length === 0) {
    const normalized = userText.toLowerCase().trim();
    return recentAvatarSpeech.includes(normalized);
  }

  // Count how many content words appear in avatar speech
  let inAvatar = 0;
  for (const w of contentWords) {
    if (avatarWords.has(w)) inAvatar++;
  }

  const echoRatio = inAvatar / contentWords.length;

  // >70% content word overlap = likely echo
  // This is much more robust than Jaccard: "photosynthesis is when plants..."
  // has "photosynthesis" in avatar speech but "plants" is novel → not echo
  return echoRatio > 0.7;
}

// ─── Backchannel vs real speech classification ─────────────────────────────
// Industry practice (ElevenLabs, Vapi): backchannels like "yeah", "uh-huh",
// "ok" should NOT trigger barge-in. They mean "I'm listening, continue."
// Only real content or explicit interrupts should stop the avatar.

const BACKCHANNELS = new Set([
  "yeah", "yes", "yep", "yup", "no", "nope",
  "ok", "okay", "sure", "right", "alright",
  "uh-huh", "uh huh", "mhm", "mm-hmm", "mm hmm",
  "got it", "i see", "oh", "ah", "hmm",
]);

/** True if the text is a backchannel (acknowledgment, not a real question/statement) */
function isBackchannel(text: string): boolean {
  const normalized = text.toLowerCase().replace(/[^a-z\s-]/g, "").trim();
  if (BACKCHANNELS.has(normalized)) return true;
  // Also check 2-word combos like "oh ok", "yeah yeah"
  const words = normalized.split(/\s+/);
  if (words.length <= 2 && words.every((w) => BACKCHANNELS.has(w))) return true;
  return false;
}

// ─── Pure noise filter (no content at all) ─────────────────────────────────
// Only filter utterances that are PURELY non-lexical: "um", "uh", "hmm"
// Do NOT filter "yeah", "ok" — those are backchannels with meaning.

const PURE_NOISE = new Set([
  "um", "uh", "hmm", "hm", "ah", "er", "mm", "erm",
]);

function isPureNoise(text: string): boolean {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  if (words.length > 2) return false; // 3+ words is never pure noise
  return words.every((w) => PURE_NOISE.has(w));
}

// ─── Constants ─────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 600; // Base debounce for normal speech
const THINKING_DEBOUNCE_MS = 1200; // Longer debounce after filler words (student thinking)
const ECHO_COOLDOWN_MS = 300; // Cooldown after AVATAR_SPEAK_ENDED
const ASR_IGNORE_MS = 1500; // Ignore initial ASR burst
const SESSION_START_TIMEOUT_MS = 15000; // Timeout for session.start()
const INTERRUPT_SETTLE_MS = 100; // Wait after interrupt before new speak
const BARGE_IN_WORD_THRESHOLD = 3; // Minimum words for barge-in during avatar speech

// ─── Client factory ────────────────────────────────────────────────────────

export function createAvatarClient(): AvatarClient {
  let session: LiveAvatarSession | null = null;
  let pendingElement: HTMLMediaElement | null = null;
  let streamReady = false;

  // Debounce ASR: accumulate fragments and fire after a pause
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingText = "";
  let currentDebounceMs = DEBOUNCE_MS;

  // Speech state
  let avatarIsSpeaking = false;
  let echoCooldownActive = false;
  let asrEnabled = false;

  // speak() promise resolution
  let speakResolve: (() => void) | null = null;

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
    currentDebounceMs = DEBOUNCE_MS; // reset to default

    if (text.length < 2) return;

    // Layer 4: pure noise filter (only "um", "uh" — not backchannels)
    if (isPureNoise(text)) {
      console.log("[AvatarClient] Filtered pure noise:", text);
      return;
    }

    userMessageCallbacks.forEach((cb) => cb(text));
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

      // FULL mode — voiceChat starts muted (push-to-talk: student holds Space to unmute)
      session = new LiveAvatarSession(token, { voiceChat: { defaultMuted: true } });

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

      // ── Avatar speaking state ──────────────────────────────────
      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => {
        console.log("[AvatarClient] AVATAR_SPEAK_STARTED");
        avatarIsSpeaking = true;

        // Flush any accumulated user speech BEFORE clearing
        if (pendingText.trim().length >= 2) {
          if (debounceTimer) clearTimeout(debounceTimer);
          flushTranscription();
        } else {
          if (debounceTimer) clearTimeout(debounceTimer);
          pendingText = "";
        }

        notifyStatus("speaking");
      });

      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
        console.log("[AvatarClient] AVATAR_SPEAK_ENDED");
        avatarIsSpeaking = false;

        // Echo cooldown — browser AEC may miss tail-end audio
        echoCooldownActive = true;
        setTimeout(() => {
          echoCooldownActive = false;
        }, ECHO_COOLDOWN_MS);

        notifyStatus("listening");

        // Resolve speak() promise
        if (speakResolve) {
          speakResolve();
          speakResolve = null;
        }
      });

      // ── User speech transcription ──────────────────────────────
      session.on(AgentEventsEnum.USER_TRANSCRIPTION, (event) => {
        const text = event.text;
        console.log(
          "[AvatarClient] USER_TRANSCRIPTION:", text,
          "speaking:", avatarIsSpeaking,
          "asr:", asrEnabled,
          "cooldown:", echoCooldownActive
        );

        // Ignore during initial ASR burst
        if (!asrEnabled) return;
        if (!text) return;

        // Ignore during echo cooldown after avatar finishes
        if (echoCooldownActive) {
          console.log("[AvatarClient] Dropped (echo cooldown):", text);
          return;
        }

        // ── During avatar speech: echo detect + barge-in logic ──
        if (avatarIsSpeaking) {
          // Layer 2: echo detection via n-gram matching
          if (isLikelyEcho(text)) {
            console.log("[AvatarClient] Dropped echo:", text);
            return;
          }

          // Layer 3: backchannel classification (don't interrupt for "yeah")
          if (isBackchannel(text)) {
            console.log("[AvatarClient] Backchannel (no interrupt):", text);
            // Still accumulate — might be part of a longer phrase
            pendingText += (pendingText ? " " : "") + text;
            return; // Don't interrupt, don't reset debounce
          }

          // Check word count — need enough words to be a real interruption
          const totalWords = (pendingText + " " + text).trim().split(/\s+/).length;
          if (totalWords < BARGE_IN_WORD_THRESHOLD) {
            // Not enough words yet — accumulate but don't interrupt
            pendingText += (pendingText ? " " : "") + text;
            console.log("[AvatarClient] Accumulating during speech:", pendingText, "(", totalWords, "words)");
            return;
          }

          // Real barge-in: enough novel words, not echo, not backchannel
          console.log("[AvatarClient] BARGE-IN:", text);
          session?.interrupt();
          avatarIsSpeaking = false;
          if (speakResolve) {
            speakResolve();
            speakResolve = null;
          }
          notifyStatus("listening");
        }

        // ── Accumulate and debounce ──────────────────────────────
        pendingText += (pendingText ? " " : "") + text;

        // Layer 5: adaptive debounce — if user said filler words, they might
        // be thinking. Use longer debounce to avoid cutting them off.
        // (Inspired by ElevenLabs' turn-taking model and OpenAI's semantic_vad)
        const lastWord = text.toLowerCase().trim().split(/\s+/).pop() ?? "";
        if (PURE_NOISE.has(lastWord) || lastWord === "like" || lastWord === "so") {
          currentDebounceMs = THINKING_DEBOUNCE_MS;
          console.log("[AvatarClient] Thinking pause detected, debounce:", currentDebounceMs);
        }

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(flushTranscription, currentDebounceMs);
      });

      // Timeout on session.start()
      await Promise.race([
        session.start(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("LiveAvatar session.start() timed out")),
            SESSION_START_TIMEOUT_MS
          )
        ),
      ]);

      console.log("[AvatarClient] Session started");

      // Enable ASR after initial burst settles
      setTimeout(() => {
        asrEnabled = true;
        console.log("[AvatarClient] ASR enabled after initial burst window");
      }, ASR_IGNORE_MS);
    },

    async endSession() {
      if (debounceTimer) clearTimeout(debounceTimer);
      pendingText = "";
      asrEnabled = false;
      if (session) {
        await session.stop();
        session = null;
        pendingElement = null;
        streamReady = false;
        avatarIsSpeaking = false;
        echoCooldownActive = false;
        speakResolve = null;
        clearSpeechHistory();
        notifyStatus("disconnected");
      }
    },

    // speak() returns Promise resolving on AVATAR_SPEAK_ENDED
    // Interrupts current speech if still playing
    async speak(text: string) {
      if (!session) return;

      // Interrupt current speech before starting new one
      if (avatarIsSpeaking) {
        session.interrupt();
        avatarIsSpeaking = false;
        await new Promise((r) => setTimeout(r, INTERRUPT_SETTLE_MS));
      }

      // Track what we're saying for echo detection
      addToSpeechHistory(text);

      // Set speaking state immediately
      avatarIsSpeaking = true;
      notifyStatus("speaking");

      // Fire-and-forget repeat(), wrapped in Promise for caller
      return new Promise<void>((resolve) => {
        speakResolve = resolve;
        session!.repeat(text);

        // Safety timeout if AVATAR_SPEAK_ENDED never fires
        const wordCount = text.split(/\s+/).length;
        const estimatedMs = wordCount * 150 + 2000;
        setTimeout(() => {
          if (speakResolve === resolve) {
            console.warn("[AvatarClient] speak() safety timeout after", estimatedMs, "ms");
            speakResolve = null;
            resolve();
          }
        }, estimatedMs);
      });
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
      tryAttach();
    },

    onUserMessage(callback) {
      userMessageCallbacks.push(callback);
    },

    async mute() {
      if (session) {
        try {
          await session.voiceChat.mute();
        } catch (err) {
          console.error("[AvatarClient] Failed to mute:", err);
        }
      }
    },

    async unmute() {
      if (session) {
        try {
          await session.voiceChat.unmute();
        } catch (err) {
          console.error("[AvatarClient] Failed to unmute:", err);
        }
      }
    },

    onStatusChange(callback) {
      statusChangeCallbacks.push(callback);
    },
  };
}
