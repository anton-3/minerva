// useAvatar hook — manages HeyGen avatar lifecycle
// Wraps AvatarClient for React component consumption.
// See: specs/001-minerva-mvp/contracts/avatar.md

"use client";

export function useAvatar() {
  // TODO: Implement in Phase 3 (T024)
  // - Create AvatarClient on mount
  // - Manage MediaStream ref for video element
  // - Track avatar status
  // - Expose: startSession, endSession, speak, interrupt
  // - Clean up on unmount

  return {
    stream: null as MediaStream | null,
    status: "disconnected" as const,
    startSession: async () => { throw new Error("Not implemented"); },
    endSession: async () => { throw new Error("Not implemented"); },
    speak: async (_text: string) => { throw new Error("Not implemented"); },
    interrupt: async () => { throw new Error("Not implemented"); },
    onUserMessage: (_cb: (text: string) => void) => {},
  };
}
