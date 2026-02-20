// HeyGen / LiveAvatar module — internal types
// These types are INTERNAL to this module. Only AvatarStatus is re-exported via session types.
// No SDK types leak outside this module.
//
// LITE mode: HeyGen provides avatar rendering + lip-sync only.
// ASR is Deepgram (separate module). TTS is ElevenLabs (server-side).
// Audio sent via speakAudio() → repeatAudio() → agent.speak WebSocket events.

export type AvatarStatus = "connecting" | "connected" | "speaking" | "listening" | "disconnected";

export interface AvatarClient {
  startSession(): Promise<void>;
  endSession(): Promise<void>;
  /** Send pre-generated PCM 24kHz audio to the avatar for lip-sync.
   *  Audio is a Base64-encoded string of PCM 16-bit 24kHz mono data.
   *  Bypasses SDK bug — sends Base64 chunks directly via WebSocket.
   *  Resolves when AVATAR_SPEAK_ENDED fires. */
  speakAudio(pcmBase64: string): Promise<void>;
  /** Send text for display/logging (speech text from Claude). Does NOT generate TTS. */
  speak(text: string): Promise<void>;
  interrupt(): void;
  attach(element: HTMLMediaElement): void;
  /** Mute avatar audio output (so user doesn't hear avatar while looking at camera) */
  muteAvatarAudio(): void;
  /** Unmute avatar audio output */
  unmuteAvatarAudio(): void;
  onStatusChange(callback: (status: AvatarStatus) => void): void;
}
