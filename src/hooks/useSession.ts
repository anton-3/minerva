// useSession hook — session state machine
// Manages session lifecycle: idle → connecting → active → ended
// Coordinates avatar, canvas, and tutor brain.
// See: specs/001-minerva-mvp/plan.md

"use client";

export function useSession() {
  // TODO: Implement in Phase 3 (T028)
  // - State machine: idle → connecting → active → ended
  // - On start: create session in Supabase, init avatar, init canvas
  // - On active: wire useTutorBrain to handle conversation loop
  // - On end: save transcript, generate summary, update progress
  // - Handle avatar disconnect (reconnect or graceful end)
  // - Timer for HeyGen 10-min session limit

  return {
    startSession: async () => { throw new Error("Not implemented"); },
    endSession: async () => { throw new Error("Not implemented"); },
  };
}
