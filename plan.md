# Minerva — Project Plan

> **Quick context for any AI agent**: Minerva is an AI avatar tutor that teaches ALL subjects to students. A HeyGen avatar teaches via real-time conversation while content appears on an interactive board (equations, graphs, simulations, videos). Multi-model AI brain (Claude, Gemini, GPT). Parents set goals and track progress. Originally built at TreeHacks 2026, now being shipped as a real product.

## Status: Post-Hackathon Product

The hackathon is over (Feb 14-16, 2026). We're now building Minerva as a real product for market. This means:
- Quality over speed — no more "good enough for demo" shortcuts
- UX research drives decisions — every interaction pattern is validated against industry standards
- Architecture must scale — no more single-session hacks

## Current Architecture

### Data Flow
```
Student speaks (push-to-talk)
  → Deepgram ASR (real-time transcription)
  → useTutorBrain sends to /api/tutor/respond
  → AI model generates speech + tool calls (SSE stream)
  → ElevenLabs TTS converts speech to audio (per-sentence streaming)
  → HeyGen LiveAvatar lip-syncs the audio
  → Tool calls execute on frontend (showSteps, executeCanvasCommands, showSandbox, showVideo)
  → Content appears on the board
```

### Tech Stack
| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16.1 LTS, React 19.2, TypeScript | App Router, Turbopack |
| Styling | Tailwind v4, shadcn/ui | Soft Lavender (#A78BFA) + Aqua (#67E8F9) design system |
| AI SDK | Vercel AI SDK (`@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/openai`) | Multi-model, tool calling, streaming |
| Models | Claude Sonnet 4.5, Haiku 4.5, Gemini 3 Pro/Flash, GPT-4.1 Nano, GPT-5.2 | User-selectable via ModelPicker |
| TTS | ElevenLabs | Server-side, PCM 24kHz, per-sentence streaming |
| Avatar | @heygen/liveavatar-web-sdk v0.0.10 | WebRTC via LiveKit, lip-sync from audio |
| ASR | Deepgram | Real-time transcription, push-to-talk |
| Board | KaTeX + GSAP + Rough.js | Equations write character-by-character, hand-drawn annotations |
| Graphing | Desmos 2D/3D, GeoGebra | Interactive, student-explorable |
| Videos | Manim (server-side) | 3Blue1Brown-style math animations |
| Sandbox | HTML iframe + Twind CSS | Physics, chemistry, biology, history visualizations |
| State | Zustand 5.0.11 | Session store with persist middleware |
| Database | Supabase (Postgres + Auth) | Profiles, sessions, progress, learning plans |
| Hosting | Vercel | SSE streaming, edge functions |

### Unified Board (Completed Session 18)
One scrollable surface with typed inline content blocks. No mode switching for sandbox/video.

| Block Type | Tool | What it shows |
|------------|------|---------------|
| `step` | `showSteps` | Equations (KaTeX), text (typewriter), labels |
| `divider` | `showSteps` | Section separator with optional heading |
| `numberLine` | `showSteps` | Number line with highlights |
| `diagram` | `showSteps` | SVG diagram |
| `graph` | `showSteps` | Inline Desmos/GeoGebra interactive plot |
| `sandbox` | `showSteps` / `showSandbox` | Inline HTML iframe (physics, chemistry, etc.) |
| `video` | `showSteps` / `showVideo` | Inline video player |
| `image` | `showSteps` | Static image |
| `code` | `showSteps` | Syntax-highlighted code block |
| Annotations | `showSteps` | Circle, underline, arrow, box, crossOut, highlight |

**Math mode** (`executeCanvasCommands`) still opens standalone Desmos/GeoGebra for complex graph interactions. This will eventually migrate to inline `graph` blocks.

### AI Context Awareness
Every turn, the AI model receives structured context about what's displayed:
- **Whiteboard**: Indexed list of all steps, equations, annotations via `serializeSteps()`
- **Math canvas**: Desmos/GeoGebra expression state via `getSnapshot()`
- **Sandbox**: Text extracted from HTML via `summarizeSandbox()`
- **Video**: URL of currently playing video
- **Student profile, learning plan, mastery scores**: All injected into each prompt

### Teaching Methodology (5-Phase)
1. **INTRODUCE** — Write topic title, give brief context, key vocabulary
2. **DEMONSTRATE** ("I Do") — Work through complete example, narrate thinking, NO questions
3. **GUIDED PRACTICE** ("We Do") — Set up similar problem, Socratic questioning begins
4. **INDEPENDENT PRACTICE** ("You Do") — Student works alone, tutor steps back
5. **ASSESS & ADVANCE** — If mastered → harder problems; if struggled → back to Phase 3

## Next Steps

1. **Test & polish** — Verify inline Desmos, sandbox iframes, and video work in the unified board
2. **Migrate executeCanvasCommands** — Replace standalone Desmos panel with inline `graph` blocks
3. **Add syntax highlighting** — Prism.js or similar for `code` blocks
4. **Delete dead code** — `SandboxPanel.tsx`, `VideoPanel.tsx` (no longer imported)
5. **Parent dashboard** — Session history, progress charts, learning plan management
6. **Mobile/tablet** — Responsive layout for the unified board

## Key Decisions Made

1. **Post-hackathon product** — Building for real users, not demo judges
2. **Multi-model support** — User can switch AI models (Claude, Gemini, GPT)
3. **ElevenLabs TTS** — Better voice quality than HeyGen's built-in TTS
4. **KaTeX + GSAP whiteboard** — Replaced tldraw. Lighter, better UX for teaching.
5. **Unified board** — One scrollable surface with typed inline blocks (DONE)
6. **5-phase teaching methodology** — Research-backed (I Do, We Do, You Do)
7. **Context awareness** — AI sees what student sees, every turn (ChatGPT Canvas pattern)
8. **Black Box Design** — All external deps wrapped in `src/lib/`, no SDK types leak

## Spec-Kit Documentation

Formal specs in `specs/001-minerva-mvp/` — these were written for the hackathon and are partially outdated. The source of truth for current state is this file (`plan.md`) and `progress.md`.
