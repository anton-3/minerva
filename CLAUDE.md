# Minerva — AI Avatar Tutor

> Originally built at TreeHacks 2026 (Feb 14-16, 2026). Now a post-hackathon product.

## First Steps for Every Session

1. **Read `progress.md`** — tells you exactly what's been done and what's next.
2. **Read `plan.md`** — full project context, architecture, and current direction.
3. **Read `.specify/memory/constitution.md`** — architecture principles and rules.
4. If working on a specific feature, check `.claude/plans/` for active implementation plans.

## Session Continuity Rules

After completing every meaningful task or group of tasks:
- **Update `progress.md`** — mark tasks complete, note what was just built, update "Next Steps".
- **Update `plan.md`** if anything changes architecturally (new decisions, changed approach, new risks).
- These files are the handoff to the next session. Treat them as the source of truth for project state.

## Research Before Building

**MANDATORY**: Before implementing any major phase, feature, or integration:
1. **Search the web** for current best practices, examples, community tips (GitHub, Devpost, Stack Overflow, official docs).
2. **Verify library versions** — we are building in **February 2026**. Do NOT use outdated APIs or deprecated patterns.
3. **Check for breaking changes** — especially for HeyGen SDK, Next.js 16, Vercel AI SDK, and Zustand v5.
4. This applies to every AI agent (Claude Code, Cursor, GitHub Copilot, etc.) — not just Claude.

## Architecture Principles (Black Box Design)

See full details in `.specify/memory/constitution.md`. The key rules:
- Every external dependency is wrapped in `src/lib/` — no SDK types leak out.
- Modules communicate only through typed interfaces defined in `src/types/`.
- Any module should be rewritable from scratch using only its interface.
- Content errors never break the tutoring session. Fail gracefully.
- One module = one person can build and maintain it.

## Tech Stack (Current — February 2026)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16.1 LTS, React 19.2, TypeScript | App Router, Turbopack |
| Styling | Tailwind v4, shadcn/ui | Soft Lavender + Aqua design system |
| AI SDK | Vercel AI SDK (`@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/openai`) | Multi-model, tool calling, SSE streaming |
| Models | Claude Sonnet 4.5, Haiku 4.5, Gemini 3 Pro/Flash, GPT-4.1 Nano, GPT-5.2 | User-selectable via ModelPicker |
| TTS | ElevenLabs | Server-side, PCM 24kHz, per-sentence streaming |
| Avatar | @heygen/liveavatar-web-sdk v0.0.10 | WebRTC via LiveKit, lip-sync from audio |
| ASR | Deepgram | Real-time transcription, push-to-talk |
| Whiteboard | KaTeX + GSAP + Rough.js | Equations write char-by-char, hand-drawn annotations |
| Graphing | Desmos 2D/3D, GeoGebra | Interactive, student-explorable |
| Videos | Manim (server-side) | 3Blue1Brown-style math animations |
| Sandbox | HTML iframe + Twind CSS | Physics, chemistry, biology, history visualizations |
| State | Zustand 5.0.11 | Session store with persist middleware |
| Database | Supabase (Postgres + Auth) | Profiles, sessions, progress, learning plans |
| Hosting | Vercel | SSE streaming, edge functions |

## Key Files

| File | Purpose |
|------|---------|
| `progress.md` | Living tracker of what's done and what's next |
| `plan.md` | Full project plan — architecture, data flow, next steps |
| `.specify/memory/constitution.md` | Architecture principles and rules |
| `src/lib/ai/prompts.ts` | THE most important file — 5-phase teaching methodology, tool rules, silence handling |
| `src/lib/ai/client.ts` | AI SDK wrapper — multi-model, tool calling, SSE streaming, context injection |
| `src/hooks/useTutorBrain.ts` | Conversation loop orchestrator — SSE consumer, silence handler |
| `src/hooks/useSession.ts` | Session lifecycle — wires avatar + brain + ASR + canvas |
| `src/stores/sessionStore.ts` | Zustand store — session state, content steps, conversation history |
| `src/components/session/StepsPanel.tsx` | Whiteboard — KaTeX rendering, GSAP animations, annotations, scroll/zoom |
| `src/app/api/tutor/respond/route.ts` | SSE API route — streams speech + audio + tool calls |
| `src/types/session.ts` | All types — ContentStep, ConversationMessage, TutorBrainRequest, etc. |
