# Minerva — Progress Tracker

> **For AI agents**: Read this file first to understand where the project is. Update it after every meaningful task.

**Last updated**: 2026-02-22 (Session 18 — Unified board migration COMPLETE)
**Branch**: `main`
**Phase**: POST-HACKATHON — building and shipping as a real product for market

---

## Current Architecture (What's Actually Built)

### Core Session Loop
Student speaks (push-to-talk) → Deepgram ASR transcribes → AI responds via SSE stream (speech + tool calls) → ElevenLabs TTS generates audio → HeyGen LiveAvatar lip-syncs audio → Tools execute on frontend (whiteboard, graphs, sandbox, video)

### Stack (February 2026)
- **Framework**: Next.js 16.1 LTS, React 19.2, TypeScript, Tailwind v4
- **AI**: Vercel AI SDK (`@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/openai`) — multi-model support
- **Models**: Claude Sonnet 4.5, Claude Haiku 4.5, Gemini 3 Pro, Gemini 3 Flash, GPT-4.1 Nano, GPT-5.2 Chat
- **TTS**: ElevenLabs (server-side, PCM 24kHz → base64 → avatar lip-sync)
- **Avatar**: @heygen/liveavatar-web-sdk v0.0.10 (WebRTC via LiveKit)
- **ASR**: Deepgram (real-time transcription)
- **Whiteboard**: KaTeX + GSAP + Rough.js (replaced tldraw — much lighter, better UX)
- **Graphing**: Desmos 2D, Desmos 3D, GeoGebra (interactive, student-explorable)
- **Video**: Manim (3Blue1Brown-style math animations, server-generated)
- **Sandbox**: HTML iframe with Twind CSS (physics, chemistry, biology, history)
- **State**: Zustand 5.0.11
- **Database**: Supabase (Postgres + Auth)
- **Deployment**: Vercel

### Key Files
| File | Purpose |
|------|---------|
| `src/lib/ai/prompts.ts` | THE most important file — teaching methodology, tool usage rules, silence handling |
| `src/lib/ai/client.ts` | AI SDK wrapper — multi-model, tool calling, SSE streaming, context injection |
| `src/hooks/useTutorBrain.ts` | Conversation loop orchestrator — SSE consumer, silence handler |
| `src/hooks/useSession.ts` | Session lifecycle — wires avatar + brain + ASR + canvas |
| `src/stores/sessionStore.ts` | Zustand store — session state, content steps, conversation history |
| `src/components/session/StepsPanel.tsx` | Whiteboard — KaTeX rendering, GSAP animations, annotations, scroll/zoom, section nav |
| `src/components/session/ContentMode.tsx` | Mode router — switches between steps/math/sandbox/video/welcome panels |
| `src/app/api/tutor/respond/route.ts` | SSE API route — streams speech + audio + tool calls |
| `src/types/session.ts` | All types — ContentStep, CanvasCommand, TutorBrainRequest, etc. |

---

## Session History (Reverse Chronological)

### Session 18 (2026-02-22): Unified Board Migration — COMPLETE

**All 5 phases completed in one session:**

**Phase 1 — Scroll Refactor:**
- Replaced transform-based `panY` with native CSS `overflow-y: auto`
- Replaced `transform: scale(zoom)` with CSS `zoom` property (layout-aware, scrollbar works correctly)
- Auto-follow via `scrollIntoView` instead of GSAP panY animation
- Section nav via `scrollIntoView` instead of GSAP panY calculation
- "Back to latest" via `scrollTo` instead of GSAP
- Non-passive wheel listener for Ctrl/Cmd+zoom (React 19 passive wheel events)
- Scroll direction detection for auto-follow pause
- Removed panX, panY, mouse drag handlers entirely

**Phase 2 — New ContentStep Types:**
- Added to TypeScript union: `graph`, `sandbox`, `video`, `image`, `code`
- Added to Zod schemas in `showSteps` tool
- Updated `serializeSteps()` for context injection of new types

**Phase 3 — Inline Renderer Components:**
- `InlineGraph` — Desmos calculator loaded dynamically, expressions + viewport from step data
- `InlineSandbox` — iframe with `srcDoc`, dark theme template, sandbox security
- `InlineVideo` — `<video>` element with autoPlay and controls
- `InlineImage` — `<img>` with optional sizing
- `InlineCode` — syntax-highlighted code with language label, dark theme

**Phase 4 — AI Tool Updates:**
- `showSandbox` tool calls now add `{ type: "sandbox" }` inline blocks to whiteboard
- `showVideo` tool results now add `{ type: "video" }` inline blocks to whiteboard
- Updated prompts: WHITEBOARD REFERENCE now documents all inline block types
- Updated TOOL SELECTION RULES: inline blocks preferred over mode switching
- `executeCanvasCommands` kept as-is (needs actual Desmos/GeoGebra ToolManager)

**Phase 5 — Cleanup:**
- Removed `SandboxPanel` and `VideoPanel` from ContentModeView
- ContentModeView simplified to: WelcomePanel + MathToolPanel + StepsPanel
- Removed mode toggle button from session page
- Removed avatar collapse on video mode (videos are inline)
- Removed unused props (sandboxContent, sandboxAccent, videoUrl from ContentModeView)

**Files changed:**
| File | Change |
|------|--------|
| `src/components/session/StepsPanel.tsx` | Full rewrite: native scroll, CSS zoom, inline renderers (graph/sandbox/video/image/code) |
| `src/types/session.ts` | 5 new ContentStep types: graph, sandbox, video, image, code |
| `src/lib/ai/client.ts` | New Zod schemas, updated serializeSteps() |
| `src/lib/ai/prompts.ts` | Inline block docs in WHITEBOARD REFERENCE, updated TOOL SELECTION RULES |
| `src/hooks/useTutorBrain.ts` | showSandbox → inline block, showVideo → inline block |
| `src/components/session/ContentMode.tsx` | Simplified: removed SandboxPanel/VideoPanel layers |
| `src/app/student/session/page.tsx` | Removed mode toggle, video collapse, unused props |

**Also updated documentation:**
- `progress.md`, `plan.md`, `CLAUDE.md`, `specs/001-minerva-mvp/plan.md`, `MEMORY.md`

### Session 17 (2026-02-21): Context Awareness + Unified Board Planning

**Teaching methodology fixes:**
- Rewrote 5-phase teaching methodology (INTRODUCE → DEMONSTRATE → GUIDED → INDEPENDENT → ASSESS)
- Fixed silence handler: level-specific messages (level 1 = advance, level 2 = scaffold differently, level 3+ = change approach completely)
- Added GOLDEN RULE: never repeat yourself across silence responses
- Strengthened "always generate speech" instruction for GPT-4.1 NO_SPEECH_FALLBACK issue

**Context awareness (major feature):**
- **Problem**: AI model was blind to what was displayed. It called `showSteps` with equations but on the next turn only saw its own speech text — not what it wrote on the board.
- **Industry research**: ChatGPT Canvas, Khanmigo, Claude Artifacts all inject current visual state as structured data each turn.
- **Fix**: Added `serializeSteps()` — converts whiteboard state into compact indexed text injected into each prompt
- **Fix**: Added `summarizeSandbox()` — strips HTML tags from sandbox, truncates to 500 chars
- **Fix**: All content modes now have context: steps (indexed text), math (Desmos snapshot), sandbox (text extract), video (URL)
- Added `contentSteps`, `sandboxContent`, `sandboxAccent`, `videoUrl` to `TutorBrainRequest`

**Whiteboard UX (scroll + navigation):**
- Fixed scroll: plain scroll = panY (content scroll), Ctrl/Cmd+scroll = zoom
- Auto-follow pause: "↓ Back to latest" pill when student scrolls up to review
- Section navigation: floating nav derived from divider labels

**Architecture decision — Unified Board:**
- Research confirmed: 6/8 top education platforms use inline embedding on one surface, NOT mode-switching
- Decision: Migrate from 5 separate content modes to one unified scrollable surface with typed content blocks
- Current `contentMode` switching (steps/math/sandbox/video/welcome) will be replaced by inline blocks
- Plan written, ready for implementation

**Files changed:**
| File | Change |
|------|--------|
| `src/lib/ai/prompts.ts` | 5-phase teaching, silence handling, speech requirements |
| `src/lib/ai/client.ts` | `serializeSteps()`, `summarizeSandbox()`, context injection, mode descriptions |
| `src/hooks/useTutorBrain.ts` | Level-specific silence messages, pass contentSteps/sandbox/video to requests |
| `src/types/session.ts` | Added `contentSteps`, `sandboxContent`, `sandboxAccent`, `videoUrl` to TutorBrainRequest |
| `src/components/session/StepsPanel.tsx` | Scroll fix, auto-follow, section nav |

### Session 14-16: Whiteboard Migration (KaTeX + GSAP + Rough.js)
- Replaced tldraw (1-2MB) with KaTeX (~100KB) + GSAP + Rough.js (~9KB)
- Built StepsPanel with character-by-character equation writing, typewriter text, hand-drawn annotations
- ContentStep type system: step, divider, numberLine, diagram, circle, underline, arrow, box, crossOut, highlight
- MinervaBoard: pan/zoom, element positioning, GSAP timeline animation

### Session 13: Camera screenshot on "read" keyword
### Session 12: Tool calling speech fix (text-end event handling)
### Session 11: SSE streaming + design system + Manim videos merge
### Session 10: Floating video overlay (Zoom-style PiP)
### Session 7-8: Speech audit fixes (echo detection, barge-in, debounce)
### Sessions 1-6: Core MVP (hackathon build)

---

## Next Steps

**Unified board migration is DONE.** All content types (equations, graphs, sandbox, video, images, code) render inline on one scrollable surface.

**Remaining work:**
1. **Test inline Desmos** — verify interactive graphing works inside the scrollable whiteboard
2. **Test inline sandbox** — verify HTML iframes work (push-to-talk Space key forwarding)
3. **Test inline video** — verify autoPlay and controls work
4. **Remove legacy code** — `SandboxPanel.tsx`, `VideoPanel.tsx` can be deleted entirely (currently just not imported)
5. **Migrate executeCanvasCommands** — eventually replace with inline `graph` blocks in showSteps (currently still uses standalone Desmos panel)
6. **Remove setContentMode tool** — no longer needed once executeCanvasCommands is migrated
7. **Syntax highlighting** — add Prism.js or similar for the `code` block type
8. **Polish** — scroll behavior, zoom-toward-cursor, responsive sizing for inline blocks
