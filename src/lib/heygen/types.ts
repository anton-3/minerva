// HeyGen / LiveAvatar module — internal types
// These types are INTERNAL to this module. Only AvatarStatus is re-exported via session types.
// No SDK types leak outside this module.

export type AvatarStatus = "connecting" | "connected" | "speaking" | "listening" | "disconnected";

export interface AvatarClient {
  startSession(): Promise<void>;
  endSession(): Promise<void>;
  speak(text: string): Promise<void>;
  interrupt(): void;
  attach(element: HTMLMediaElement): void;
  /** Mute the microphone (for push-to-talk) */
  mute(): Promise<void>;
  /** Unmute the microphone (for push-to-talk) */
  unmute(): Promise<void>;
  /** Immediately flush accumulated transcription text (call on push-to-talk release) */
  flush(): void;
  /** Fires when HeyGen ASR transcribes student speech */
  onUserMessage(callback: (text: string) => void): void;
  onStatusChange(callback: (status: AvatarStatus) => void): void;
}
