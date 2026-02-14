// Drizzle inferred types for Minerva (Simplified for Demo)
// Auto-generated from schema definitions

import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
  children,
  learningPlans,
  sessions,
  sessionSummaries,
  progress,
  transcriptEntries,
} from "./schema";

// ─── Select Types (for reading) ─────────────────────────────────────────────

export type Child = InferSelectModel<typeof children>;
export type LearningPlan = InferSelectModel<typeof learningPlans>;
export type Session = InferSelectModel<typeof sessions>;
export type SessionSummary = InferSelectModel<typeof sessionSummaries>;
export type Progress = InferSelectModel<typeof progress>;
export type TranscriptEntry = InferSelectModel<typeof transcriptEntries>;

// ─── Insert Types (for creating) ────────────────────────────────────────────

export type NewChild = InferInsertModel<typeof children>;
export type NewLearningPlan = InferInsertModel<typeof learningPlans>;
export type NewSession = InferInsertModel<typeof sessions>;
export type NewSessionSummary = InferInsertModel<typeof sessionSummaries>;
export type NewProgress = InferInsertModel<typeof progress>;
export type NewTranscriptEntry = InferInsertModel<typeof transcriptEntries>;

// ─── With Relations Types ───────────────────────────────────────────────────

export type SessionWithSummary = Session & {
  summary: SessionSummary | null;
};

export type ChildWithRelations = Child & {
  learningPlans?: LearningPlan[];
  sessions?: Session[];
  progress?: Progress[];
};

// Re-export JSONB types
export type { GoalEntry, CurriculumEntry } from "./schema";
