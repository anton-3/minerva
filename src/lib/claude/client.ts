// Claude tutor brain — Anthropic SDK wrapper
// Wraps @anthropic-ai/sdk. No Anthropic types leak outside.
// See: specs/001-minerva-mvp/contracts/tutor-brain.md

import type {
  TutorBrainRequest,
  TutorBrainResponse,
  SessionSummary,
  LearningPlan,
} from "@/types/session";

export interface TutorBrain {
  respond(request: TutorBrainRequest): Promise<TutorBrainResponse>;
  generateSummary(transcript: { speaker: string; text: string }[]): Promise<SessionSummary>;
  generateLearningPlan(goals: string[], subject: string): Promise<LearningPlan>;
}

export function createTutorBrain(): TutorBrain {
  // TODO: Implement in Phase 3 (T021)
  // - Initialize Anthropic client with ANTHROPIC_API_KEY
  // - Implement respond() with TUTOR_SYSTEM_PROMPT
  // - Parse structured JSON output, regex fallback for malformed responses
  // - Trim conversation history to last 20 messages
  throw new Error("TutorBrain not yet implemented");
}
