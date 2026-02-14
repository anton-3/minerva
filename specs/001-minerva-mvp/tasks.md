# Tasks: Minerva AI Avatar Tutor

**Input**: Design documents from `/specs/001-minerva-mvp/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] [Owner] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1-US5) or SETUP/FOUND
- **[Owner]**: Person A/B/C/D from team ownership table

## Research Gate (applies to all phases)

**Before starting each phase**, the implementing AI/person MUST:
1. Search for current best practices, official docs, and community examples for the relevant technologies
2. Verify API patterns against **February 2026** library versions (not outdated tutorials)
3. Check GitHub issues/discussions for known pitfalls with our specific versions
4. Look at Devpost, GitHub repos, and blogs for similar integrations (e.g., "HeyGen + Next.js", "tldraw programmatic shapes", "Claude structured JSON output")

This prevents wasted time building with deprecated patterns. Document any findings that change the approach.

---

## Phase 1: Setup (Hours 0-2)

**Purpose**: Project structure, types, interfaces — everything needed before implementation.

- [x] T001 [SETUP] [A] Project scaffolding: Next.js 16.1, Tailwind v4, shadcn/ui, all npm dependencies
- [x] T002 [SETUP] [A] spec-kit init: constitution.md, spec.md, plan.md, contracts/, data-model.md
- [x] T003 [P] [SETUP] [A] Create core type files: `src/types/session.ts` (TutorBrainRequest, TutorBrainResponse, CanvasCommand, SessionState, TranscriptEntry, LearningPlan, SessionSummary) and `src/types/database.ts` (Supabase schema types)
- [x] T004 [P] [SETUP] [D] Create Supabase migration: `supabase/migrations/001_initial_schema.sql` with all 7 tables from data-model.md
- [x] T005 [P] [SETUP] [D] Create `.env.example` with all required environment variables
- [x] T006 [P] [SETUP] [B] Create placeholder files for all black box modules: `src/lib/heygen/client.ts`, `src/lib/heygen/types.ts`, `src/lib/canvas/commands.ts`, `src/lib/canvas/types.ts`
- [x] T007 [P] [SETUP] [C] Create placeholder files for all API-side modules: `src/lib/claude/client.ts`, `src/lib/claude/prompts.ts`, `src/lib/perplexity/client.ts`, `src/lib/recall/client.ts`
- [x] T008 [P] [SETUP] [D] Create Supabase client wrappers: `src/lib/supabase/client.ts` (browser) and `src/lib/supabase/server.ts` (server)
- [x] T009 [P] [SETUP] [A] Create placeholder hooks: `src/hooks/useAvatar.ts`, `src/hooks/useCanvas.ts`, `src/hooks/useTutorBrain.ts`, `src/hooks/useSession.ts`
- [x] T010 [P] [SETUP] [A] Create Zustand session store: `src/stores/sessionStore.ts` (fully implemented)
- [x] T011 [P] [SETUP] [ALL] Create placeholder component files: `src/components/session/AvatarPanel.tsx`, `CanvasPanel.tsx`, `ChatPanel.tsx`, `SessionControls.tsx`; `src/components/shared/Header.tsx`, `LoadingSpinner.tsx`

**Checkpoint**: All files exist. All interfaces defined. Team can split and work independently.

---

## Phase 2: Foundational (Hours 2-4)

**Purpose**: Core infrastructure that MUST be complete before user story work begins.

- [ ] T012 [P] [FOUND] [D] Set up Supabase project: create project, run migration, enable RLS, configure auth (email/password)
- [ ] T013 [P] [FOUND] [D] Implement Supabase client wrappers in `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts` with cookie-based auth
- [ ] T014 [P] [FOUND] [D] Create root layout `src/app/layout.tsx` with Tailwind, fonts, metadata
- [ ] T015 [P] [FOUND] [D] Create shared `src/components/shared/Header.tsx` (logo, nav, auth state) and `src/components/shared/LoadingSpinner.tsx`

**Checkpoint**: Supabase connected, auth working, base layout renders. User story work can begin.

---

## Phase 3: User Story 1 - Live Tutoring Session (Priority: P1) — THE WOW MOMENT

**Goal**: Student speaks to AI avatar, avatar responds with speech AND draws on whiteboard. Complete conversation loop.

**Independent Test**: Start session → speak to avatar → avatar responds verbally with guiding question → equation/diagram appears on whiteboard → student answers → avatar gives feedback.

**Owners**: Person B (avatar + canvas), Person C (Claude brain + APIs), Person A (orchestration)

### Black Box Modules (B + C work in parallel)

- [ ] T016 [P] [US1] [C] Implement `/api/heygen/token/route.ts` — server-side HeyGen access token generation
- [ ] T017 [P] [US1] [B] Implement HeyGen avatar client `src/lib/heygen/client.ts` — AvatarClient interface: startSession, endSession, speak, interrupt, onUserMessage, onStatusChange
- [ ] T018 [P] [US1] [B] Implement HeyGen types `src/lib/heygen/types.ts` — AvatarStatus type, internal SDK type mappings
- [ ] T019 [P] [US1] [B] Implement canvas types `src/lib/canvas/types.ts` — CanvasCommand discriminated union
- [ ] T020 [P] [US1] [B] Implement canvas command executor `src/lib/canvas/commands.ts` — CanvasExecutor: execute, executeSequence, clear, getSnapshot + 4 math templates (drawEquation, drawNumberLine, drawCoordinatePlane, drawFraction)
- [ ] T021 [P] [US1] [C] Implement Claude client `src/lib/claude/client.ts` — TutorBrain.respond() with structured JSON output parsing
- [ ] T022 [P] [US1] [C] Write Socratic tutor system prompt `src/lib/claude/prompts.ts` — Socratic method, age-appropriate language, canvas command JSON format, safety guardrails

### API Routes (C)

- [ ] T023 [US1] [C] Implement `/api/tutor/respond/route.ts` — accepts TutorBrainRequest, calls Claude, returns TutorBrainResponse with speech + canvasCommands (depends on T021, T022)

### Hooks (A + B)

- [ ] T024 [P] [US1] [B] Implement `src/hooks/useAvatar.ts` — React hook wrapping AvatarClient lifecycle (init, cleanup, status tracking, MediaStream ref)
- [ ] T025 [P] [US1] [B] Implement `src/hooks/useCanvas.ts` — React hook wrapping CanvasExecutor (tldraw Editor ref, command execution, snapshot)
- [ ] T026 [P] [US1] [A] Implement `src/stores/sessionStore.ts` — Zustand store: session state (idle/connecting/active/ended), conversation history, current transcript, avatar status, student profile
- [ ] T027 [US1] [A] Implement `src/hooks/useTutorBrain.ts` — conversation loop orchestrator: student speaks → call /api/tutor/respond → avatar.speak() + canvas.executeSequence() → update store (depends on T023, T024, T025, T026)
- [ ] T028 [US1] [A] Implement `src/hooks/useSession.ts` — session state machine: idle → connecting → active → ended. Coordinates avatar + canvas + brain lifecycle (depends on T027)

### Components (A + B)

- [ ] T029 [P] [US1] [B] Implement `src/components/session/AvatarPanel.tsx` — renders HeyGen video stream, shows avatar status indicator, handles connection errors
- [ ] T030 [P] [US1] [B] Implement `src/components/session/CanvasPanel.tsx` — renders tldraw canvas, read-only for student (AI draws), passes Editor ref to useCanvas
- [ ] T031 [P] [US1] [A] Implement `src/components/session/ChatPanel.tsx` — text chat sidebar showing conversation transcript, text input fallback (FR-011)
- [ ] T032 [P] [US1] [A] Implement `src/components/session/SessionControls.tsx` — mic toggle, session timer, end session button

### Page (A)

- [ ] T033 [US1] [A] Implement `src/app/student/session/page.tsx` — THE core page. Layout: AvatarPanel (left) + CanvasPanel (right) + ChatPanel (bottom or side). Wires useSession to all components (depends on T028-T032)
- [ ] T034 [US1] [A] Implement `src/app/student/page.tsx` — student home: "Start Session" button, shows active learning plan if exists

**Checkpoint**: End-to-end demo works. Avatar greets student, student asks about algebra, avatar draws equation on canvas and guides through solution. SC-001, SC-002, SC-003, SC-005 validated.

---

## Phase 4: User Story 2 - Parent Dashboard and Goal Setting (Priority: P2)

**Goal**: Parent signs up, creates child profile, sets learning goals, views progress and session summaries.

**Independent Test**: Parent creates account → adds child → sets goals → (after session) sees summary + progress.

**Owner**: Person D (primary), Person C (session/progress API routes)

### Auth + Profiles (D)

- [ ] T035 [P] [US2] [D] Implement `src/app/login/page.tsx` — email/password auth for parents, PIN entry for students. Uses Supabase Auth.
- [ ] T036 [P] [US2] [D] Implement parent layout `src/app/parent/layout.tsx` — sidebar nav (Dashboard, Children, Goals, Progress, Sessions), auth guard

### API Routes (C + D)

- [ ] T037 [P] [US2] [C] Implement `/api/session/route.ts` — Session CRUD: create session (on start), update session (on end with ended_at)
- [ ] T038 [P] [US2] [C] Implement `/api/progress/route.ts` — GET progress for a child (all topics), POST/PATCH to update mastery score after session

### Parent Dashboard Pages (D)

- [ ] T039 [P] [US2] [D] Implement `src/app/parent/page.tsx` — dashboard overview: child list, recent sessions, quick stats
- [ ] T040 [P] [US2] [D] Implement `src/app/parent/children/page.tsx` — add/edit child profiles (name, age, grade, PIN)
- [ ] T041 [P] [US2] [D] Implement `src/app/parent/goals/page.tsx` — set learning goals per child per subject
- [ ] T042 [US2] [D] Implement `src/app/parent/progress/page.tsx` — progress charts (mastery by topic, trend over sessions) using recharts (depends on T038)
- [ ] T043 [US2] [D] Implement `src/app/parent/sessions/page.tsx` — session history list with summaries (depends on T037)

### Parent Components (D)

- [ ] T044 [P] [US2] [D] Implement `src/components/parent/ChildCard.tsx` — child profile card with name, age, grade, PIN
- [ ] T045 [P] [US2] [D] Implement `src/components/parent/GoalForm.tsx` — form to create/edit learning goals
- [ ] T046 [P] [US2] [D] Implement `src/components/parent/ProgressChart.tsx` — recharts bar/line chart for topic mastery
- [ ] T047 [P] [US2] [D] Implement `src/components/parent/SessionSummaryCard.tsx` — card showing session summary with scores

**Checkpoint**: Full parent flow works. Parent creates account, adds child, sets goals, sees dashboard. SC-004 validated.

---

## Phase 5: User Story 3 - Personalized Adaptive Learning Plan (Priority: P3)

**Goal**: System generates a structured learning plan from parent goals. Tutor follows the plan. Plan advances as student demonstrates mastery.

**Independent Test**: Set goals → generate plan → start session → tutor teaches current topic → end session → plan advances to next topic.

**Owner**: Person C (plan generation), Person A (session integration)

- [ ] T048 [US3] [C] Implement TutorBrain.generateLearningPlan() in `src/lib/claude/client.ts` — Claude generates ordered topics from parent goals
- [ ] T049 [US3] [C] Implement `/api/tutor/plan/route.ts` — POST: generate learning plan for child+subject, GET: fetch current plan
- [ ] T050 [US3] [A] Update `src/hooks/useTutorBrain.ts` to include learning plan context in TutorBrainRequest — tutor automatically teaches the current topic (depends on T049)
- [ ] T051 [US3] [A] Update session end flow to advance learning plan currentTopic based on progressUpdate from Claude (depends on T050)
- [ ] T052 [US3] [D] Update `src/app/parent/goals/page.tsx` to trigger learning plan generation when goals are saved (depends on T049)

**Checkpoint**: Learning plans generate from goals, tutor follows the plan, plan advances on mastery.

---

## Phase 6: User Story 4 - Session Recording and Transcript (Priority: P4)

**Goal**: Each session captures a transcript. Post-session AI summary generated for parents.

**Independent Test**: Complete session → transcript entries stored → summary generated → parent sees summary in dashboard.

**Owner**: Person C (recording + summary), Person A (transcript capture in session)

- [ ] T053 [P] [US4] [C] Implement Recall.ai client `src/lib/recall/client.ts` — SessionRecorder: startRecording, stopRecording
- [ ] T054 [P] [US4] [C] Implement `/api/recall/bot/route.ts` — POST to create recording bot for session
- [ ] T055 [P] [US4] [C] Implement `/api/recall/webhook/route.ts` — receives transcript chunks from Recall.ai, saves to transcript_entries table
- [ ] T056 [US4] [A] Add in-memory transcript capture to `src/hooks/useSession.ts` — fallback: capture student messages from onUserMessage + tutor responses from Claude, save to Supabase on session end
- [ ] T057 [US4] [C] Implement TutorBrain.generateSummary() in `src/lib/claude/client.ts` — generates SessionSummary from transcript
- [ ] T058 [US4] [C] Implement `/api/session/summary/route.ts` — POST: generate summary for completed session (calls generateSummary with transcript entries)

**Checkpoint**: Sessions have transcripts. AI summaries appear in parent dashboard after session ends.

---

## Phase 7: User Story 5 - Real-Time Knowledge Lookup (Priority: P5)

**Goal**: Tutor retrieves factual information from Perplexity Sonar when students ask knowledge-based questions.

**Independent Test**: Student asks factual question → tutor response includes accurate, sourced information.

**Owner**: Person C

- [ ] T059 [P] [US5] [C] Implement Perplexity client `src/lib/perplexity/client.ts` — KnowledgeLookup: search
- [ ] T060 [US5] [C] Implement `/api/search/route.ts` — POST: query Perplexity Sonar, return answer + citations
- [ ] T061 [US5] [C] Update `/api/tutor/respond/route.ts` to optionally call Perplexity when Claude determines external knowledge is needed (depends on T060)

**Checkpoint**: Factual questions get sourced answers woven into tutor's response.

---

## Phase 8: Polish & Demo Prep (Hours 30-36)

**Purpose**: Landing page, UI polish, demo rehearsal, deployment.

- [ ] T062 [P] [ALL] Implement `src/app/page.tsx` — landing page: hero section, value prop, screenshots, CTA to sign up
- [ ] T063 [P] [D] Final Vercel deployment: production env vars, custom domain if available
- [ ] T064 [P] [D] Create demo account with sample data: parent + child + goals + completed session with summary + progress records
- [ ] T065 [P] [C] Claude prompt tuning: test 20+ student messages, refine JSON output, ensure Socratic method consistency
- [ ] T066 [P] [B] Canvas visual polish: colors, fonts, animation timing, ensure math templates render correctly at demo resolution
- [ ] T067 [P] [A] Edge case handling: avatar disconnect recovery, session timeout warning (2 min before HeyGen limit), mic denied → text fallback
- [ ] T068 [ALL] Demo rehearsal: run through demo script 3 times. Record backup video.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 types + placeholders
- **US1 (Phase 3)**: Depends on Phase 2 (Supabase + layout) — CRITICAL PATH
- **US2 (Phase 4)**: Depends on Phase 2, can run in parallel with US1
- **US3 (Phase 5)**: Depends on US1 (tutor brain) + US2 (goals page)
- **US4 (Phase 6)**: Depends on US1 (session flow)
- **US5 (Phase 7)**: Depends on US1 (tutor respond route)
- **Polish (Phase 8)**: Depends on US1 + US2 minimum

### Within US1 (Critical Path)

```
T016-T022 (black box modules, all [P]) → T023 (respond route) → T024-T026 (hooks, [P]) → T027 (tutorBrain hook) → T028 (session hook) → T029-T032 (components, [P]) → T033 (session page)
```

### Parallel Opportunities by Person

**Hours 2-12 (US1):**
- Person A: T026 → T027 → T028 → T031, T032 → T033, T034
- Person B: T017, T018, T019, T020 → T024, T025 → T029, T030
- Person C: T016, T021, T022 → T023
- Person D: T012, T013, T014, T015 → T035, T036 (start US2 early)

**Hours 12-24 (US2 + US3):**
- Person A: T050, T051 (US3 integration)
- Person B: Canvas polish (T066 early start)
- Person C: T037, T038, T048, T049, T053-T058
- Person D: T039-T047, T052

**Hours 24-36 (US4 + US5 + Polish):**
- Person A: T056, T067
- Person B: T066
- Person C: T059-T061, T065
- Person D: T062-T064
