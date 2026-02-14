# Minerva — Progress Tracker

> **For AI agents**: Read this file first to understand where the project is. Update it after every meaningful task or group of tasks.

**Last updated**: 2026-02-14
**Branch**: `001-minerva-mvp`
**Overall status**: Spec-kit complete. Implementation not yet started.

---

## Completed

### Phase 1: Setup (T001-T002)
- [x] **T001** Project scaffolding: Next.js 16.1, Tailwind v4, shadcn/ui (15 components), all npm deps installed
- [x] **T002** spec-kit init: constitution.md, spec.md, plan.md, data-model.md, 5 contracts, tasks.md (68 tasks)
- [x] Created CLAUDE.md, plan.md (root), progress.md (root) for session continuity
- [x] Created .env.example with all required environment variables
- [x] Initial git commit on `main` with scaffolding, currently on branch `001-minerva-mvp`

---

## In Progress

Nothing currently in progress. Ready to begin Phase 1 remaining tasks (T003-T011).

---

## Not Started

### Phase 1: Setup — Remaining (T003-T011)
- [ ] **T003** Core type files: `src/types/session.ts` + `src/types/database.ts`
- [ ] **T004** Supabase migration: `supabase/migrations/001_initial_schema.sql`
- [ ] **T005** `.env.example` update (already exists, may need review)
- [ ] **T006** Black box module placeholders (heygen, canvas)
- [ ] **T007** Black box module placeholders (claude, perplexity, recall)
- [ ] **T008** Supabase client wrappers
- [ ] **T009** Placeholder hooks (useAvatar, useCanvas, useTutorBrain, useSession)
- [ ] **T010** Zustand session store placeholder
- [ ] **T011** Placeholder components (session + shared)

### Phase 2: Foundational (T012-T015)
- [ ] Supabase project setup, auth, RLS
- [ ] Root layout, shared components

### Phase 3: US1 — Live Tutoring Session (T016-T034) — CRITICAL PATH
- [ ] HeyGen avatar client + API token route
- [ ] Canvas command executor + math templates
- [ ] Claude tutor brain + Socratic prompt
- [ ] `/api/tutor/respond` route
- [ ] Hooks: useAvatar, useCanvas, useTutorBrain, useSession
- [ ] Components: AvatarPanel, CanvasPanel, ChatPanel, SessionControls
- [ ] Session page (THE core page)

### Phase 4: US2 — Parent Dashboard (T035-T047)
- [ ] Login page (parent auth + student PIN)
- [ ] Parent dashboard pages (overview, children, goals, progress, sessions)
- [ ] Parent components (ChildCard, GoalForm, ProgressChart, SummaryCard)
- [ ] Session + progress API routes

### Phase 5: US3 — Learning Plans (T048-T052)
- [ ] Learning plan generation via Claude
- [ ] `/api/tutor/plan` route
- [ ] Session integration with learning plan context

### Phase 6: US4 — Recording + Transcript (T053-T058)
- [ ] Recall.ai client + API routes
- [ ] In-memory transcript fallback
- [ ] Session summary generation

### Phase 7: US5 — Knowledge Lookup (T059-T061)
- [ ] Perplexity client
- [ ] `/api/search` route
- [ ] Integration with tutor respond route

### Phase 8: Polish + Demo (T062-T068)
- [ ] Landing page
- [ ] Demo account with sample data
- [ ] Prompt tuning, canvas polish, edge cases
- [ ] Demo rehearsal + backup video

---

## Notes for Next Session

- **Start with T003-T011** (all parallelizable) — create all type files, placeholder files, and directory structure
- Then **T012-T015** (foundational) — Supabase setup, layout, shared components
- Then **T016-T034** (US1) — this is the critical path to the "wow moment"
- All task details with exact file paths are in `specs/001-minerva-mvp/tasks.md`
- All module interfaces are in `specs/001-minerva-mvp/contracts/`
- Database schema is in `specs/001-minerva-mvp/data-model.md`
