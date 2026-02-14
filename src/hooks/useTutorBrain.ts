// useTutorBrain hook — conversation loop orchestrator
// Coordinates: student speaks → Claude responds → avatar speaks + canvas draws
// See: specs/001-minerva-mvp/plan.md (Core Session Flow)

"use client";

export function useTutorBrain() {
  // TODO: Implement in Phase 3 (T027)
  // - Listen for student messages (from useAvatar.onUserMessage)
  // - Call /api/tutor/respond with full context
  // - Feed speech to avatar.speak()
  // - Feed canvasCommands to canvas.executeSequence()
  // - Update sessionStore with new messages and progress
  // - Handle errors gracefully (avatar continues even if canvas fails)

  return {
    isProcessing: false,
    handleStudentMessage: async (_message: string) => {
      throw new Error("Not implemented");
    },
  };
}
