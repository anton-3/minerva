// HeyGen avatar module — internal types
// These types are INTERNAL to this module. Only AvatarStatus is re-exported via session types.
// No HeyGen SDK types leak outside this module.
// See: specs/001-minerva-mvp/contracts/avatar.md

export type AvatarStatus = "connecting" | "connected" | "speaking" | "listening" | "disconnected";

export interface AvatarClient {
  startSession(): Promise<{ stream: MediaStream }>;
  endSession(): Promise<void>;
  speak(text: string): Promise<void>;
  interrupt(): Promise<void>;
  onUserMessage(callback: (text: string) => void): void;
  onStatusChange(callback: (status: AvatarStatus) => void): void;
}
