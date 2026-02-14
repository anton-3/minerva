# Minerva — Progress Tracker

> **For AI agents**: Read this file first to understand where the project is. Update it after every meaningful task or group of tasks.

**Last updated**: 2026-02-14
**Branch**: `001-minerva-mvp`
**Overall status**: Phase 1 Setup complete. Ready for Phase 2 (Foundational) + Phase 3 (US1).

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

## In Progress

Starting Phase 2 (Foundational) + Phase 3 (US1 — Core Session).

---

## Not Started

### Phase 2: Foundational (T012-T015)
- [ ] **T012** Set up Supabase project: create project, run migration, enable RLS, configure auth
- [ ] **T013** Implement Supabase client wrappers with cookie-based auth (stubs exist, need real config)
- [ ] **T014** Root layout with Tailwind, fonts, metadata (basic layout exists from create-next-app)
- [ ] **T015** Shared Header + LoadingSpinner (stubs exist, need auth-aware nav)

### Phase 3: US1 — Live Tutoring Session (T016-T034) — CRITICAL PATH
- [ ] **T016** `/api/heygen/token/route.ts` — server-side token generation
- [ ] **T017** HeyGen avatar client implementation
- [ ] **T018** HeyGen types implementation
- [ ] **T019** Canvas types (stub exists)
- [ ] **T020** Canvas command executor + 4 math templates
- [ ] **T021** Claude tutor brain client implementation
- [ ] **T022** Socratic tutor system prompt (THE most important task)
- [ ] **T023** `/api/tutor/respond/route.ts`
- [ ] **T024-T028** Hooks: useAvatar, useCanvas, useTutorBrain, useSession
- [ ] **T029-T032** Components: AvatarPanel, CanvasPanel, ChatPanel, SessionControls
- [ ] **T033** Session page (`src/app/student/session/page.tsx`)
- [ ] **T034** Student home page

### Phase 4-8: See `specs/001-minerva-mvp/tasks.md` for full details

---

## Notes for Next Session

- **Phase 2 (T012-T015)** requires a real Supabase project — need API keys in .env.local
- **Phase 3** is the critical path — the "wow moment" for the demo
- Per constitution VI, **research HeyGen SDK 2.1.0, tldraw 4.3.1, Zustand 5.x** before implementing
- The Zustand store (T010) is already fully implemented — hooks can build on it immediately
- Supabase client wrappers (T008) use @supabase/ssr cookie patterns — ready for auth
- `npm run check` validates lint + types in one command
