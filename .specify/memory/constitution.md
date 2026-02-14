# Minerva Constitution

## Core Principles

### I. Black Box Interfaces
Every module is a black box with a clean, documented API. Implementation details are completely hidden. Modules communicate only through well-defined interfaces. Any module should be rewritable from scratch using only its interface. If you can't understand a module, it should be easy to replace. Never expose internal implementation details in the interface.

### II. Single Responsibility & Replaceability
One module = one person should be able to build and maintain it. Each module has a single, clear purpose. Split complex functionality into multiple focused modules. Design APIs that work even if the implementation changes completely. Any module can be swapped without breaking others.

### III. Primitive-First Design
Identify core "primitive" data types that flow through the system. Design everything around these primitives. Keep primitives simple and consistent. Build complexity through composition, not complicated primitives. For Minerva, our primitives are: `TutorResponse`, `CanvasCommand`, `TranscriptEntry`, `SessionState`, `LearningPlan`.

### IV. Format/Interface Simplicity
Make interfaces as simple as possible to implement. Prefer one good way over multiple complex options. Choose semantic meaning over structural complexity. Design for implementability - other team members must be able to build to your interface.

### V. Wrap External Dependencies
Never depend directly on code you don't control. All external APIs (HeyGen, Claude, Perplexity, Recall.ai, Supabase, Zoom) must be accessed through thin wrapper modules in `src/lib/`. If a dependency changes or is replaced, only the wrapper needs updating. No external SDK types should leak into component interfaces.

## Technology Requirements

- **Framework**: Next.js 16.1 LTS (App Router, React 19.2, TypeScript)
- **Styling**: Tailwind CSS v4 with `@tailwindcss/postcss`
- **UI Components**: shadcn/ui (pre-installed)
- **State Management**: Zustand 5.x
- **Canvas**: tldraw 4.x
- **Avatar**: HeyGen Streaming Avatar SDK 2.x
- **AI**: Anthropic Claude API via `@anthropic-ai/sdk`
- **Knowledge**: Perplexity Sonar API
- **Recording**: Recall.ai REST API
- **Database**: Supabase (Postgres + Auth + Realtime)
- **Deployment**: Vercel
- **Team Workflow**: spec-kit for spec-driven development

## Development Workflow

- **Hackathon context**: 36-hour build, team of 4 with mixed skills
- **Git workflow**: Short-lived feature branches, merge to main via PRs
- **Code ownership**: Each team member owns specific modules (see spec)
- **Interface-first**: Define module interfaces before implementation
- **No over-engineering**: Build the simplest thing that works. YAGNI applies.
- **Fail gracefully**: If an external API call fails, the session should continue. Canvas errors never break the tutor conversation.

## VI. Research Before Building

**MANDATORY for all AI agents** (Claude Code, Cursor, GitHub Copilot, etc.):

Before implementing any major phase, feature, or integration, you MUST research:
1. **Official docs** for the specific library version we're using (Feb 2026 versions — see Technology Requirements)
2. **GitHub issues/discussions** for common pitfalls and breaking changes
3. **Community examples** — Devpost projects, tutorials, blog posts from 2025-2026
4. **Best practices** — patterns that the community has converged on

This prevents building with outdated APIs, deprecated patterns, or approaches the community has already found better alternatives for. We are building in **February 2026** — verify everything against current versions.

## VII. Session Continuity

After completing every meaningful task or group of tasks:
1. **Update `progress.md`** (project root) — mark tasks complete, note what was built, update "Next Steps"
2. **Update `plan.md`** (project root) if anything changes architecturally
3. At the start of every session, read `CLAUDE.md`, then `progress.md`, then this constitution

These files are the handoff between sessions. Any AI agent should be able to pick up exactly where the last one left off by reading them.

**Full project vision and strategy**: See [humble-discovering-sunrise.md](/Users/kimsanov/.claude/plans/humble-discovering-sunrise.md) — the original planning document with architecture, timeline, prize strategy, demo script, and risk mitigations.

## Governance

This constitution supersedes all other practices. All code must comply with the black box interface principle. External dependencies must always be wrapped. When in doubt, ask: "Can someone rewrite this module using only its interface?"

**Version**: 1.1.0 | **Ratified**: 2026-02-14
