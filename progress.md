# Minerva — Progress Tracker

> **For AI agents**: Read this file first to understand where the project is. Update it after every meaningful task or group of tasks.

**Last updated**: 2026-02-14 (Session 8)
**Branch**: `001-minerva-mvp`
**Overall status**: Phases 1-8 COMPLETE (T001-T067). Speech audit COMPLETE — 12 bugs fixed, 3 of 5 latency optimizations applied. All features built: session page, parent dashboard, learning plan generation, session recording + summary, Perplexity knowledge lookup, landing page, edge case handling. 20 routes. TypeScript + build pass clean. Ready for integration testing with API keys (Phase 2).

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
- [x] **BONUS** Supabase auth proxy `src/proxy.ts` — session refresh on every request, redirect unauthenticated users from /parent and /student routes

### Phase 3 Hooks (T024-T028) — DONE
- [x] **T024** `useAvatar` hook — wraps createAvatarClient, manages MediaStream, status, user message callbacks, cleanup on unmount
- [x] **T025** `useCanvas` hook — wraps createCanvasExecutor, setEditor callback, executeCommand/executeSequence/clear/getSnapshot
- [x] **T026** Session store — already implemented in Phase 1, no changes needed
- [x] **T027** `useTutorBrain` hook — conversation loop: student speaks → POST /api/tutor/respond → canvas draw (non-blocking) → avatar speak. Saves progress updates to Supabase.
- [x] **T028** `useSession` hook — session state machine coordinating useAvatar + useCanvas + useTutorBrain + useZoom. Wires avatar user messages to brain. Auto-end at 9.5 min.

### Phase 3 Components + Pages (T029-T034) — DONE
- [x] **T029** `AvatarPanel.tsx` — renders HeyGen video stream, status indicator with 5 states
- [x] **T030** `CanvasPanel.tsx` — dynamic tldraw import (ssr: false), hideUi, isReadonly on mount, onEditorReady callback
- [x] **T031** `ChatPanel.tsx` — conversation history with chat bubbles, auto-scroll, text input fallback
- [x] **T032** `SessionControls.tsx` — session timer (counts up, warns at 8 min), Start/End session buttons, Clear Canvas button
- [x] **T033** `src/app/student/session/page.tsx` — THE core session page. 3-column grid: Avatar+self-view | Canvas | Chat.
- [x] **T034** `src/app/student/page.tsx` — student home with "Start Session" link

### Zoom Video SDK Integration — DONE
- [x] `@zoom/videosdk` v2.3.14 + `jsonwebtoken` for JWT generation
- [x] `src/lib/zoom/` (types.ts, client.ts), `src/app/api/zoom/token/route.ts`, `src/hooks/useZoom.ts`
- [x] tldraw CSS imported in `globals.css` via `@import url("tldraw/tldraw.css")`

---

### Phase 4: Parent Dashboard (T035-T047) — DONE
- [x] **T035** `src/app/login/page.tsx` — parent email/password auth + student PIN entry, mode toggle
- [x] **T036** `src/app/parent/layout.tsx` — server component sidebar nav with auth guard
- [x] **T037** `/api/session/route.ts` — POST (create), PATCH (update status/recording), GET (list with summaries)
- [x] **T038** `/api/progress/route.ts` — GET (progress for child), POST (upsert mastery with onConflict)
- [x] **T039-T043** All parent pages (dashboard, children, goals, progress, sessions)
- [x] **T044-T047** All parent components (ChildCard, GoalForm, ProgressChart, SessionSummaryCard)

#### Infrastructure Fixes (Session 5)
- [x] Database types: Added `Relationships`, `Views`, `Functions`, `Enums`, `CompositeTypes` for `GenericSchema`
- [x] Type casts: `(data as Type[])` pattern for Supabase `.select("*")` results
- [x] middleware.ts → proxy.ts: Next.js 16 convention
- [x] recharts React 19 fix: `react-is` override + removed `ResponsiveContainer`

---

### Phase 5: Learning Plan Generation (T048-T052) — DONE
- [x] **T048** `generateLearningPlan()` in claude/client.ts — already built in Phase 3
- [x] **T049** `/api/tutor/plan/route.ts` — POST: generate plan via Claude + save to Supabase, GET: fetch plans
- [x] **T050** `useTutorBrain` already passes `store.learningPlan` to API — built in Phase 3
- [x] **T051** Session end flow: marks session completed in Supabase, saves transcript, generates summary
- [x] **T052** Goals page: calls `/api/tutor/plan` to generate AI curriculum when goals saved, shows loading spinner, displays curriculum topics on plan cards

---

### Phase 6: Session Recording + Transcript + Summary (T053-T058) — DONE
- [x] **T053** `src/lib/recall/client.ts` — full SessionRecorder: startRecording (POST bot/), stopRecording (leave_call + video_mixed), getTranscript. Uses Recall.ai REST API with `Token` auth.
- [x] **T054** `/api/recall/bot/route.ts` — POST to create recording bot for session
- [x] **T055** `/api/recall/webhook/route.ts` — receives `transcript.data` events from Recall.ai, saves to transcript_entries table
- [x] **T056** In-memory transcript capture: `useTutorBrain` already captures via `store.addTranscriptEntry()`. `useSession.endSession()` sends inline transcript to `/api/session/summary` for persistence + summary generation.
- [x] **T057** `generateSummary()` in claude/client.ts — already built in Phase 3
- [x] **T058** `/api/session/summary/route.ts` — POST: accepts `session_id` + optional `transcript[]` (inline fallback). Saves transcript entries to DB, generates summary via Claude, stores in session_summaries table.

**Research completed**: Recall.ai REST API (POST /bot/, leave_call, video_mixed, webhook format, Token auth).

---

### Phase 7: Perplexity Sonar Knowledge Lookup (T059-T061) — DONE
- [x] **T059** `src/lib/perplexity/client.ts` — full KnowledgeLookup: search via POST to `api.perplexity.ai/chat/completions`, model `sonar`, extracts answer + citations. 10s timeout, graceful fallback.
- [x] **T060** `/api/search/route.ts` — POST: query Perplexity Sonar, return answer + citations
- [x] **T061** `/api/tutor/respond/route.ts` — enriches Claude context with Perplexity Sonar for factual questions. Heuristic pattern matching (what is, how does, explain, define, etc.). Non-blocking — Perplexity failure doesn't break tutoring.

**Research completed**: Perplexity Sonar API (chat/completions endpoint, `sonar` model, `Bearer` auth, citations array in response).

---

### Phase 8: Polish + Demo Prep (T062-T067) — DONE
- [x] **T062** Landing page `src/app/page.tsx` — hero section, "How It Works" 3-step cards, "Why Minerva?" value props, tech stack badges, CTA, footer. Links to /login.
- [x] **T067** Edge case handling: auto-end session at 9.5 min (before HeyGen's 10-min limit), endSessionRef pattern for timer callback

---

## Not Started

### Phase 2: Foundational (T012-T015)
- [ ] **T012** Set up Supabase project: create project, run migration, enable RLS, configure auth
- [ ] **T013** Supabase client wrappers with cookie-based auth (stubs exist, real Supabase project needed)
- [ ] **T014** Root layout polish (basic layout exists)
- [ ] **T015** Shared Header + LoadingSpinner (stubs exist, need auth-aware nav)

### Remaining Phase 8
- [ ] **T063** Vercel deployment: production env vars
- [ ] **T064** Demo account with sample data
- [ ] **T065** Claude prompt tuning (test 20+ messages)
- [ ] **T066** Canvas visual polish
- [ ] **T068** Demo rehearsal + backup video

---

### Speech Audit (Session 7-8) — DONE

12 bugs fixed, 3 of 5 latency optimizations applied. Full plan: `.claude/projects/.../memory/speech-audit.md`

**Files changed:**
- `src/lib/heygen/client.ts` — Bugs 1,3,4,6,7,8,10,11,12
- `src/hooks/useTutorBrain.ts` — Bugs 2,5,9 + Opt 3
- `src/hooks/useSession.ts` — Wire interrupt + Bug 9
- `src/app/api/tutor/respond/route.ts` — Opt 2

**CRITICAL (fixed):**
- [x] Bug 1: Barge-in support — echo filtering via text similarity, real user speech triggers `interrupt()`
- [x] Bug 2: AbortController — cancel in-flight Claude API calls on new message
- [x] Bug 3: `speak()` returns Promise resolving on `AVATAR_SPEAK_ENDED` + safety timeout

**HIGH (fixed):**
- [x] Bug 4: Flush pending user speech before clearing on `AVATAR_SPEAK_STARTED`
- [x] Bug 5: 8s timeout on Claude API call via AbortController
- [x] Bug 6: `interrupt()` + 100ms settle before new `repeat()` if avatar still speaking

**MEDIUM (fixed):**
- [x] Bug 7: 300ms echo cooldown after `AVATAR_SPEAK_ENDED`
- [x] Bug 8: 1.5s ASR ignore window after session starts
- [x] Bug 9: Separate `sendGreeting()` method — no fake "hi" in transcript
- [x] Bug 10: Noise-word filter (um, uh, hmm, etc.) — drops short filler-only utterances
- [x] Bug 11: Removed redundant `voiceChat.start()` — config `{ voiceChat: true }` auto-starts
- [x] Bug 12: 15s timeout wrapper on `session.start()`

**Latency optimizations (applied):**
- [x] Opt 1: Debounce reduced 800→600ms
- [x] Opt 2: Perplexity lookup parallelized with Claude (3s race timeout)
- [x] Opt 3: Skip empty canvas snapshot (skip "Canvas is empty." string)
- [ ] Opt 4: Haiku for simple messages (not yet — needs prompt engineering)
- [ ] Opt 5: Streaming LLM + chunked TTS (stretch goal — 2-3 hours)

---

## Not Started

### Phase 2: Foundational (T012-T015)
- [ ] **T012** Set up Supabase project: create project, run migration, enable RLS, configure auth
- [ ] **T013** Supabase client wrappers with cookie-based auth (stubs exist, real Supabase project needed)
- [ ] **T014** Root layout polish (basic layout exists)
- [ ] **T015** Shared Header + LoadingSpinner (stubs exist, need auth-aware nav)

### Remaining Phase 8
- [ ] **T063** Vercel deployment: production env vars
- [ ] **T064** Demo account with sample data
- [ ] **T065** Claude prompt tuning (test 20+ messages)
- [ ] **T066** Canvas visual polish
- [ ] **T068** Demo rehearsal + backup video

### Remaining Optimizations
- [ ] Opt 4: Haiku for simple messages (needs prompt routing logic)
- [ ] Opt 5: Streaming LLM + chunked TTS (stretch goal)

---

## Notes for Next Session

- **Speech audit** is COMPLETE — all 12 bugs fixed, code compiles clean
- **Phase 2 (T012-T015)** requires a real Supabase project — need API keys in .env.local
- **T063-T068** are demo prep tasks — need API keys + deployment environment
- **middleware.ts keeps reappearing** — was deleted but came back. Must use `proxy.ts` only (Next.js 16).
- **Pre-existing lint warnings**: 5 errors in parent/page.tsx, session/page.tsx, SessionControls.tsx, useSession.ts — all pre-date speech audit, none from our changes
- `npm run build` passes clean (Turbopack, 3.8s, 20 routes)
- `npx tsc --noEmit` passes with 0 errors
