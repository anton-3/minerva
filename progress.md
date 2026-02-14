# Minerva — Progress Tracker

> **For AI agents**: Read this file first to understand where the project is. Update it after every meaningful task or group of tasks.

**Last updated**: 2026-02-14 (Session 4)
**Branch**: `001-minerva-mvp`
**Overall status**: Phase 3 FULLY COMPLETE (T016-T034). All hooks, components, Zoom integration, and session pages built. Ready for Phase 4 (Parent Dashboard).

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

### Phase 3 Hooks (T024-T028) — DONE
- [x] **T024** `useAvatar` hook — wraps createAvatarClient, manages MediaStream, status, user message callbacks, cleanup on unmount
- [x] **T025** `useCanvas` hook — wraps createCanvasExecutor, setEditor callback, executeCommand/executeSequence/clear/getSnapshot
- [x] **T026** Session store — already implemented in Phase 1, no changes needed
- [x] **T027** `useTutorBrain` hook — conversation loop: student speaks → POST /api/tutor/respond → canvas draw (non-blocking) → avatar speak. Uses optionsRef to avoid stale closures.
- [x] **T028** `useSession` hook — session state machine coordinating useAvatar + useCanvas + useTutorBrain + useZoom. Wires avatar user messages to brain.

### Phase 3 Components + Pages (T029-T034) — DONE
- [x] **T029** `AvatarPanel.tsx` — renders HeyGen video stream, status indicator with 5 states (connecting/connected/speaking/listening/disconnected)
- [x] **T030** `CanvasPanel.tsx` — dynamic tldraw import (ssr: false), hideUi, isReadonly on mount, onEditorReady callback
- [x] **T031** `ChatPanel.tsx` — conversation history with chat bubbles, auto-scroll, text input fallback (FR-011), "Thinking..." indicator
- [x] **T032** `SessionControls.tsx` — session timer (counts up, warns at 8 min), Start/End session buttons, Clear Canvas button
- [x] **T033** `src/app/student/session/page.tsx` — THE core session page. 3-column grid: Avatar+self-view | Canvas | Chat. Wires useSession to all components. Zoom as primary call framework.
- [x] **T034** `src/app/student/page.tsx` — student home with "Start Session" link

### Zoom Video SDK Integration — DONE (new, not in original tasks)
- [x] Installed `@zoom/videosdk` v2.3.12 + `jsonwebtoken` for JWT generation
- [x] `src/lib/zoom/types.ts` — ZoomSessionStatus, ZoomClient interface (black box, no SDK types leak)
- [x] `src/lib/zoom/client.ts` — wraps @zoom/videosdk with dynamic import (no SSR). Handles join/leave, video (canvas-based), audio, mute toggle.
- [x] `src/app/api/zoom/token/route.ts` — POST endpoint generating JWT with HS256, topic, role, 2-hour expiry
- [x] `src/hooks/useZoom.ts` — React hook for Zoom lifecycle (joinSession, leaveSession, startVideo, startAudio, toggleMute)
- [x] `useSession` updated to start Zoom + HeyGen in parallel on session start
- [x] tldraw CSS imported in `globals.css` via `@import url("tldraw/tldraw.css")` (official pattern from tldraw/nextjs-template)

**Research completed before building**: tldraw CSS import pattern (official Next.js template uses @import in globals.css), Zoom Video SDK web API (createClient → init → join, canvas-based renderVideo, startAudio), React 19.2 type deprecations (FormEvent → structural type). All verified against Feb 2026 versions.

**Build passes clean**: `npx tsc --noEmit` (0 errors), `npm run build` (all routes registered, static pages generated).

---

## Not Started

### Phase 2: Foundational (T012-T015)
- [ ] **T012** Set up Supabase project: create project, run migration, enable RLS, configure auth
- [ ] **T013** Supabase client wrappers with cookie-based auth (stubs exist, real Supabase project needed)
- [ ] **T014** Root layout polish (basic layout exists)
- [ ] **T015** Shared Header + LoadingSpinner (stubs exist, need auth-aware nav)

### Phase 4-8: See `specs/001-minerva-mvp/tasks.md` for full details

---

## Notes for Next Session

- **Phase 2 (T012-T015)** requires a real Supabase project — need API keys in .env.local
- **Phase 4 (Parent Dashboard)** is next — auth, child profiles, goals, progress charts
- **Zoom as primary call**: Session page uses Zoom Video SDK as the call framework, HeyGen avatar renders alongside
- **@zoom/videosdk** must be dynamically imported (uses `window` at module level)
- **tldraw** must be dynamically imported via `next/dynamic` with `ssr: false`
- **Next.js 16 middleware** is deprecated — migrate to "proxy" convention when time permits
- **React 19.2**: `React.FormEvent`, `React.FormEventHandler` etc. are deprecated hints (still work, non-blocking)
- `npm run build` passes clean (Turbopack, 3.2s)
