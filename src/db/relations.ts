// Drizzle ORM relations for Minerva (Simplified for Demo)
// Defines foreign key relationships for relational queries

import { relations } from "drizzle-orm";
import {
  children,
  learningPlans,
  sessions,
  sessionSummaries,
  progress,
  transcriptEntries,
} from "./schema";

// ─── Relations ──────────────────────────────────────────────────────────────

export const childrenRelations = relations(children, ({ many }) => ({
  learningPlans: many(learningPlans),
  sessions: many(sessions),
  progress: many(progress),
}));

export const learningPlansRelations = relations(learningPlans, ({ one, many }) => ({
  child: one(children, {
    fields: [learningPlans.childId],
    references: [children.id],
  }),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  child: one(children, {
    fields: [sessions.childId],
    references: [children.id],
  }),
  learningPlan: one(learningPlans, {
    fields: [sessions.learningPlanId],
    references: [learningPlans.id],
  }),
  summary: one(sessionSummaries),
  transcriptEntries: many(transcriptEntries),
}));

export const sessionSummariesRelations = relations(sessionSummaries, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionSummaries.sessionId],
    references: [sessions.id],
  }),
}));

export const progressRelations = relations(progress, ({ one }) => ({
  child: one(children, {
    fields: [progress.childId],
    references: [children.id],
  }),
}));

export const transcriptEntriesRelations = relations(transcriptEntries, ({ one }) => ({
  session: one(sessions, {
    fields: [transcriptEntries.sessionId],
    references: [sessions.id],
  }),
}));
