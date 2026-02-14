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
  /** Fires when HeyGen ASR transcribes student speech (debounced) */
  onUserMessage(callback: (text: string) => void): void;
  onStatusChange(callback: (status: AvatarStatus) => void): void;
}
