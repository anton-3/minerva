# Minerva — Project Plan

> **Quick context for any AI agent**: Minerva is an AI avatar tutor for middle school students. A HeyGen avatar teaches via real-time conversation while using interactive math tools (Desmos 2D, Desmos 3D, GeoGebra). Claude powers the tutor brain (Socratic method). Parents set goals and track progress. Built for TreeHacks 2026 (36-hour hackathon, 4-person team).

## Full Vision & Strategy

See the detailed plan file with architecture diagrams, timeline, team split, prize strategy, demo script, and risk mitigations:

**[humble-discovering-sunrise.md](/Users/kimsanov/.claude/plans/humble-discovering-sunrise.md)**

This was the original planning document created during the first session. It contains the full context including:
- Problem/solution framing and competitive analysis
- Architecture diagram with data flow
- Detailed 36-hour timeline split by 4 people
- Zoom integration strategy (stretch goal)
- Prize strategy (targeting 10 tracks)
- Demo script (2.5 min)
- Risk mitigations
- Environment variables

## Spec-Kit Documentation

All formal specifications live in `specs/001-minerva-mvp/`:

| Document | What it covers |
|----------|---------------|
| [spec.md](specs/001-minerva-mvp/spec.md) | 5 user stories (P1-P5), acceptance scenarios, edge cases, 13 functional requirements, 6 key entities, 7 success criteria |
| [plan.md](specs/001-minerva-mvp/plan.md) | Tech stack, project structure, 5 black box module contracts (TypeScript interfaces), team ownership, execution phases |
| [tasks.md](specs/001-minerva-mvp/tasks.md) | 68 granular tasks across 8 phases, organized by user story, parallel markers, owner assignments |
| [data-model.md](specs/001-minerva-mvp/data-model.md) | 7 Supabase tables: profiles, children, learning_plans, sessions, session_summaries, progress, transcript_entries |
| [contracts/avatar.md](specs/001-minerva-mvp/contracts/avatar.md) | HeyGen SDK wrapper — AvatarClient interface |
| [contracts/canvas.md](specs/001-minerva-mvp/contracts/canvas.md) | Multi-tool wrapper — CanvasCommand type + CanvasExecutor interface (Desmos, Desmos 3D, GeoGebra) |
| [contracts/tutor-brain.md](specs/001-minerva-mvp/contracts/tutor-brain.md) | Claude wrapper — TutorBrain interface (respond, generateSummary, generateLearningPlan) |
| [contracts/knowledge.md](specs/001-minerva-mvp/contracts/knowledge.md) | Perplexity wrapper — KnowledgeLookup interface |
| [contracts/recorder.md](specs/001-minerva-mvp/contracts/recorder.md) | Recall.ai wrapper — SessionRecorder interface |

## Architecture (One-Liner)

Student speaks → HeyGen transcribes → Claude responds with speech + canvas commands → avatar speaks + math tools visualize (Desmos/GeoGebra) → progress saved to Supabase → parent dashboard shows real-time updates.

## Current Phase

See `progress.md` for the live status of what's been completed and what's next.

## Key Decisions Made

1. **Next.js full-stack** (no Python) — all APIs are REST/SDK calls from Node.js
2. **Multi-tool canvas (Desmos + GeoGebra)** — replaced tldraw with professional math tools for better educational value
3. **Middle school (11-14)** — best demo impact for judges
4. **HeyGen standalone first, Zoom as stretch** — build core experience first (hours 0-24), add Zoom wrapper later (hours 24-36)
5. **Black Box Design** (Eskil Steenberg) — every external dep wrapped, modules replaceable
6. **spec-kit** for spec-driven development — constitution → spec → plan → tasks → implement
7. **Full student interactivity** — students can manipulate graphs/geometry, not just view
