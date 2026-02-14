// Drizzle ORM schema for Minerva (Simplified for Demo)
// Mirrors: supabase/migrations/001_initial_schema.sql
// See: specs/001-minerva-mvp/data-model.md

import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  timestamp,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";

// JSONB field types
export interface GoalEntry {
  description: string;
  target_date?: string;
  status: "active" | "completed" | "paused";
}

export interface CurriculumEntry {
  name: string;
  description: string;
  prerequisites: string[];
}

// ─── Tables ─────────────────────────────────────────────────────────────────

/**
 * children: Student profiles (simplified - no parent relationship for demo)
 */
export const children = pgTable("children", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  grade: integer("grade").notNull(),
  pin: text("pin").notNull(),
});

/**
 * learningPlans: Personalized curriculum per child per subject
 */
export const learningPlans = pgTable("learning_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  childId: uuid("child_id")
    .notNull()
    .references(() => children.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  goals: jsonb("goals").$type<GoalEntry[]>().notNull().default([]),
  currentTopic: text("current_topic"),
  curriculum: jsonb("curriculum").$type<CurriculumEntry[] | null>(),
});

/**
 * sessions: Individual tutoring sessions
 */
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  childId: uuid("child_id")
    .notNull()
    .references(() => children.id, { onDelete: "cascade" }),
  learningPlanId: uuid("learning_plan_id").references(() => learningPlans.id, {
    onDelete: "set null",
  }),
  status: text("status").notNull().default("active"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  recordingUrl: text("recording_url"),
});

/**
 * sessionSummaries: AI-generated post-session reports
 */
export const sessionSummaries = pgTable("session_summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .unique()
    .references(() => sessions.id, { onDelete: "cascade" }),
  summary: text("summary"),
  topicsCovered: text("topics_covered").array(),
  strengths: text("strengths").array(),
  areasForImprovement: text("areas_for_improvement").array(),
  engagementScore: real("engagement_score"),
  comprehensionScore: real("comprehension_score"),
});

/**
 * progress: Granular topic mastery tracking
 */
export const progress = pgTable(
  "progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    topic: text("topic").notNull(),
    score: real("score").notNull().default(0.0),
  },
  (table) => [unique("progress_child_subject_topic").on(table.childId, table.subject, table.topic)]
);

/**
 * transcriptEntries: Conversation transcript from sessions
 */
export const transcriptEntries = pgTable("transcript_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  speaker: text("speaker").notNull(),
  text: text("text").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});
