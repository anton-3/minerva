# Minerva — AI Avatar Tutor (TreeHacks 2026)

## First Steps for Every Session

1. **Read the constitution**: `.specify/memory/constitution.md` — this defines all architecture principles and rules.
2. **Read progress**: `progress.md` — this tells you exactly what's been done and what's next.
3. **Read the plan**: `plan.md` — this has the full project context, links to all spec-kit docs, and the overall vision.
4. If working on a specific feature, read the relevant spec-kit docs in `specs/001-minerva-mvp/`.

## Session Continuity Rules

After completing every meaningful task or group of tasks:
- **Update `progress.md`** — mark tasks complete, note what was just built, update "Next Steps".
- **Update `plan.md`** if anything changes architecturally (new decisions, changed approach, new risks).
- These files are the handoff to the next session. Treat them as the source of truth for project state.

## Research Before Building

**MANDATORY**: Before implementing any major phase, feature, or integration:
1. **Search the web** for current best practices, examples, community tips (GitHub, Devpost, Stack Overflow, official docs).
2. **Verify library versions** — we are building in **February 2026**. Do NOT use outdated APIs or deprecated patterns.
3. **Check for breaking changes** — especially for HeyGen SDK, tldraw, Next.js 16, Supabase, and Zustand v5.
4. This applies to every AI agent (Claude Code, Cursor, GitHub Copilot, etc.) — not just Claude.

What to research:
- Official documentation for the specific library version we're using
- GitHub issues/discussions for common pitfalls
- Devpost projects using similar tech for inspiration
- Community examples and tutorials published in 2025-2026

## Architecture Principles (Black Box Design)

See full details in `.specify/memory/constitution.md`. The key rules:
- Every external dependency is wrapped in `src/lib/` — no SDK types leak out.
- Modules communicate only through typed interfaces defined in `src/types/`.
- Any module should be rewritable from scratch using only its interface.
- Canvas errors never break the tutoring session. Fail gracefully.
- One module = one person can build and maintain it.

## Tech Stack

- Next.js 16.1 LTS (App Router, React 19.2, TypeScript)
- Tailwind CSS v4 with @tailwindcss/postcss
- shadcn/ui components
- tldraw 4.3.1 (canvas)
- @heygen/streaming-avatar 2.1.0 (avatar)
- @anthropic-ai/sdk 0.74.0 (Claude tutor brain)
- Perplexity Sonar API (knowledge)
- Recall.ai REST API (recording)
- Supabase (auth + Postgres + realtime)
- Zustand 5.0.11 (state management)
- Deployed on Vercel

## Key Files

| File | Purpose |
|------|---------|
| `progress.md` | Living tracker of what's done and what's next |
| `plan.md` | Full project plan with links to all docs |
| `.specify/memory/constitution.md` | Architecture principles and rules |
| `specs/001-minerva-mvp/spec.md` | Feature specification (5 user stories) |
| `specs/001-minerva-mvp/plan.md` | Implementation plan (tech stack, contracts, structure) |
| `specs/001-minerva-mvp/tasks.md` | 68 implementation tasks across 8 phases |
| `specs/001-minerva-mvp/data-model.md` | Database schema (7 tables) |
| `specs/001-minerva-mvp/contracts/` | 5 black box module interface contracts |
| `src/lib/claude/prompts.ts` | THE most important file — Socratic tutor prompt |
