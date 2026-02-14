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
  /** Fires when avatar starts/stops speaking — used to pause browser STT */
  onSpeakingChange(callback: (isSpeaking: boolean) => void): void;
  onStatusChange(callback: (status: AvatarStatus) => void): void;
}
