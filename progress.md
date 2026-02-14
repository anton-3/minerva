# Minerva — Progress Tracker

> **For AI agents**: Read this file first to understand where the project is. Update it after every meaningful task or group of tasks.

**Last updated**: 2026-02-14 (Session 3)
**Branch**: `001-minerva-mvp`
**Overall status**: Phase 3 black box modules (T016-T023) complete. Ready for hooks (T024-T028) and components (T029-T034).

---

## Completed

### Phase 1: Setup (T001-T011) — DONE
- [x] **T001** Project scaffolding: Next.js 16.1, Tailwind v4, shadcn/ui (15 components), all npm deps
- [x] **T002** spec-kit: constitution.md, spec.md, plan.md, data-model.md, 5 contracts, tasks.md
- [x] **T003** Core type files: `src/types/session.ts` (all primitives) + `src/types/database.ts` (Supabase schema types)
- [x] **T004** Supabase migration: `supabase/migrations/001_initial_schema.sql` (7 tables + RLS policies)
- [x] **T005** `.env.example` with all required environment variables
- [x] **T006** Black box module stubs: `src/lib/heygen/` (client.ts, types.ts), `src/lib/canvas/` (commands.ts, types.ts)
- [x] **T007** Black box module stubs: `src/lib/claude/` (client.ts, prompts.ts), `src/lib/perplexity/client.ts`, `src/lib/recall/client.ts`
- [x] **T008** Supabase client wrappers: `src/lib/supabase/client.ts` (browser), `src/lib/supabase/server.ts` (server) — implemented with @supabase/ssr
- [x] **T009** Placeholder hooks: useAvatar, useCanvas, useTutorBrain, useSession
- [x] **T010** Zustand session store: `src/stores/sessionStore.ts` — fully implemented with all actions
- [x] **T011** Placeholder components: AvatarPanel, CanvasPanel, ChatPanel, SessionControls, Header, LoadingSpinner
- [x] CLAUDE.md, plan.md (root), progress.md (root) for session continuity
- [x] Added `npm run check` script (lint + typecheck) — passes with 0 errors
- [x] `npm run build` passes (Turbopack, < 1s)

**42 source files. All interfaces defined. TypeScript compiles clean. Team can split and build independently.**

---

### Phase 3 Black Box Modules (T016-T023) — DONE
- [x] **T016** `/api/heygen/token/route.ts` — POST endpoint, fetches one-time token from HeyGen API with `x-api-key` header
- [x] **T017** HeyGen avatar client `src/lib/heygen/client.ts` — full AvatarClient: startSession (token fetch → StreamingAvatar → createStartAvatar → startVoiceChat), endSession, speak (TaskType.REPEAT), interrupt, event callbacks
- [x] **T018** HeyGen types `src/lib/heygen/types.ts` — AvatarStatus union type, AvatarClient interface
- [x] **T019** Canvas types `src/lib/canvas/types.ts` — CanvasCommand re-export, CanvasExecutor interface (unchanged from Phase 1)
- [x] **T020** Canvas command executor `src/lib/canvas/commands.ts` — 6 math templates (drawEquation, drawNumberLine, drawCoordinatePlane, drawAngle, drawFraction, highlight), createShape passthrough, clear, executeSequence with delay, getSnapshot. Uses tldraw v4 `toRichText()`, toggles `isReadonly` for AI drawing.
- [x] **T021** Claude tutor brain `src/lib/claude/client.ts` — uses `@anthropic-ai/sdk` with `zodOutputFormat` (structured outputs GA), Zod schemas for TutorBrainResponse/SessionSummary/LearningPlan, regex fallback for malformed responses, conversation history trimmed to 20 messages
- [x] **T022** Socratic tutor system prompt `src/lib/claude/prompts.ts` — subject-agnostic (adapts to learning plan), Socratic method, canvas command reference, safety guardrails, age-appropriate language. Also wrote SUMMARY_SYSTEM_PROMPT and LEARNING_PLAN_SYSTEM_PROMPT.
- [x] **T023** `/api/tutor/respond/route.ts` — POST endpoint accepting TutorBrainRequest, returns TutorBrainResponse, graceful error handling
- [x] **BONUS** Supabase auth middleware `src/middleware.ts` — session refresh on every request, redirect unauthenticated users from /parent and /student routes

**Research completed before building**: HeyGen SDK 2.1.0 (events, token, TaskType), tldraw 4.3.1 (toRichText, createShape, isReadonly), Claude SDK structured outputs (zodOutputFormat GA, output_config.format), Supabase SSR (getUser, middleware pattern). All verified against Feb 2026 versions.

---

## In Progress

Phase 3 hooks (T024-T028) and components (T029-T034).

---

## Not Started

### Phase 2: Foundational (T012-T015)
- [ ] **T012** Set up Supabase project: create project, run migration, enable RLS, configure auth
- [ ] **T013** Supabase client wrappers with cookie-based auth (stubs exist, real Supabase project needed)
- [ ] **T014** Root layout polish (basic layout exists)
- [ ] **T015** Shared Header + LoadingSpinner (stubs exist, need auth-aware nav)

### Phase 3: Hooks + Components (T024-T034)
- [ ] **T024** `useAvatar` hook — avatar lifecycle (init, cleanup, status, MediaStream ref)
- [ ] **T025** `useCanvas` hook — tldraw editor ref + command execution
- [ ] **T026** Session store update (already implemented in Phase 1)
- [ ] **T027** `useTutorBrain` hook — conversation loop orchestrator
- [ ] **T028** `useSession` hook — session state machine
- [ ] **T029-T032** Components: AvatarPanel, CanvasPanel, ChatPanel, SessionControls
- [ ] **T033** Session page (`src/app/student/session/page.tsx`)
- [ ] **T034** Student home page

### Phase 4-8: See `specs/001-minerva-mvp/tasks.md` for full details

---

## Notes for Next Session

- **Phase 2 (T012-T015)** requires a real Supabase project — need API keys in .env.local
- **Hooks are next** — useAvatar wraps createAvatarClient, useCanvas wraps createCanvasExecutor, useTutorBrain calls /api/tutor/respond
- **tldraw must be dynamically imported** in CanvasPanel (`next/dynamic` with `ssr: false`)
- HeyGen SDK also needs client-side only — use `"use client"` directive
- The Zustand store (T010) is already fully implemented — hooks can build on it immediately
- `npm run check` passes with 0 errors, 6 warnings (from placeholder hooks)
