# Implementation Plan: Minerva AI Avatar Tutor

**Branch**: `main` | **Last Updated**: 2026-02-21 | **Spec**: [spec.md](./spec.md)

> **Note**: This spec was originally written for the TreeHacks 2026 hackathon (Feb 14-16, 2026). Minerva is now a post-hackathon product. The source of truth for current architecture is `plan.md` and `progress.md` in the project root.

## Summary

AI avatar tutor platform where a HeyGen LiveAvatar teaches students via real-time conversation. An interactive whiteboard (KaTeX + GSAP + Rough.js) displays equations, graphs, simulations, and videos inline. Multi-model AI brain (Claude, Gemini, GPT) powers tutoring via Vercel AI SDK. ElevenLabs provides TTS. Deepgram provides ASR. Parents set goals and track progress via dashboard. Deployed on Vercel.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js (Next.js runtime)
**Primary Dependencies**:
| Dependency | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.1 LTS | Framework (App Router, Turbopack) |
| React | 19.2 | UI |
| Tailwind CSS | v4 | Styling |
| Vercel AI SDK | latest | Multi-model AI (`@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/openai`) |
| @heygen/liveavatar-web-sdk | 0.0.10 | Avatar (WebRTC via LiveKit) |
| ElevenLabs | server-side | TTS (PCM 24kHz, per-sentence streaming) |
| Deepgram | real-time | ASR (push-to-talk transcription) |
| KaTeX | latest | Math equation rendering |
| GSAP | latest | Whiteboard animations |
| Rough.js | latest | Hand-drawn annotations |
| Desmos API | 2D + 3D | Interactive graphing |
| GeoGebra API | latest | Interactive geometry |
| Supabase | 2.95.3 | Database (Postgres + Auth) |
| Zustand | 5.0.11 | State management |

**Storage**: Supabase (Postgres + Auth + Realtime)
**Target Platform**: Web browser (desktop + tablet), deployed on Vercel
**Project Type**: Web application (full-stack Next.js)

## Constitution Check

*GATE: Must pass before implementation.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Black Box Interfaces | PASS | Every external dependency wrapped in `src/lib/`. Components communicate via typed interfaces. |
| II. Single Responsibility | PASS | Each module has clear ownership boundaries. |
| III. Primitive-First Design | PASS | Core primitives: `ContentStep`, `ConversationMessage`, `TranscriptEntry`, `SessionState`, `LearningPlanContext` |
| IV. Interface Simplicity | PASS | One way to do each thing. Semantic types over structural complexity. |
| V. Wrap External Dependencies | PASS | HeyGen, AI SDK, ElevenLabs, Deepgram, Supabase all wrapped in `src/lib/` modules |

## Project Structure

### Source Code

```text
src/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout
│   ├── login/page.tsx            # Auth page
│   ├── parent/                   # Parent dashboard
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Dashboard overview
│   │   ├── children/page.tsx     # Manage children
│   │   ├── goals/page.tsx        # Set learning goals
│   │   ├── progress/page.tsx     # View progress charts
│   │   └── sessions/page.tsx     # Session history
│   ├── student/
│   │   ├── page.tsx              # Student home
│   │   └── session/page.tsx      # THE tutoring session (core)
│   └── api/                      # API routes
│       ├── heygen/token/route.ts
│       ├── tutor/respond/route.ts  # SSE streaming endpoint
│       ├── tutor/plan/route.ts
│       ├── elevenlabs/tts/route.ts
│       ├── session/route.ts
│       └── progress/route.ts
├── components/
│   ├── ui/                       # shadcn/ui
│   ├── session/                  # Session page components
│   │   ├── AvatarPanel.tsx       # HeyGen avatar video display
│   │   ├── StepsPanel.tsx        # Whiteboard (KaTeX + GSAP + Rough.js)
│   │   ├── ContentMode.tsx       # Content mode router (being unified)
│   │   ├── SandboxPanel.tsx      # HTML iframe sandbox (being inlined)
│   │   ├── MathToolPanel.tsx     # Desmos/GeoGebra wrapper (being inlined)
│   │   ├── VideoPanel.tsx        # Video player (being inlined)
│   │   ├── BottomControlBar.tsx  # Mic, controls, model picker
│   │   └── ModelPicker.tsx       # AI model selection
│   ├── parent/                   # Parent dashboard components
│   └── shared/
├── lib/                          # BLACK BOX MODULES
│   ├── heygen/                   # Avatar module
│   │   └── client.ts             # LiveAvatar SDK wrapper + speech pipeline
│   ├── ai/                       # Tutor brain module (was lib/claude/)
│   │   ├── client.ts             # Vercel AI SDK wrapper, multi-model, tool calling, context injection
│   │   └── prompts.ts            # System prompts (5-phase teaching methodology)
│   ├── elevenlabs/               # TTS module
│   │   └── client.ts             # ElevenLabs API wrapper
│   ├── deepgram/                 # ASR module
│   │   └── client.ts             # Deepgram real-time transcription
│   ├── supabase/                 # Database module
│   │   ├── client.ts             # Browser client
│   │   └── server.ts             # Server client
│   └── utils.ts
├── hooks/
│   ├── useSession.ts             # Session lifecycle — wires avatar + brain + ASR
│   ├── useTutorBrain.ts          # Conversation loop — SSE consumer, silence handler
│   ├── useAvatar.ts              # Avatar lifecycle hook
│   └── useDeepgram.ts            # ASR hook
├── stores/
│   └── sessionStore.ts           # Zustand session state
└── types/
    ├── session.ts                # Core types (ContentStep, ConversationMessage, etc.)
    └── database.ts               # Supabase schema types
```

## Core Data Flow

```
Student speaks (push-to-talk button)
  → Deepgram ASR (real-time transcription)
  → useTutorBrain sends POST /api/tutor/respond
  → Vercel AI SDK: streamText() with tools (multi-model)
  → SSE stream: speech text + audio chunks + tool calls
  → ElevenLabs TTS: per-sentence audio generation (PCM 24kHz)
  → HeyGen LiveAvatar: lip-sync from audio bytes
  → Tool calls execute on frontend:
    - showSteps → adds ContentStep[] to whiteboard
    - executeCanvasCommands → Desmos/GeoGebra interactions
    - showSandbox → HTML iframe visualization
    - showVideo → Manim math animation
  → Content appears on the board
```

## Key Interfaces (Current)

### ContentStep (Whiteboard blocks)

```typescript
export type ContentStep =
  | { type: "clear" }
  | { type: "step"; label?: string; math?: string; text?: string }
  | { type: "divider"; label?: string }
  | { type: "numberLine"; min: number; max: number; highlights?: number[] }
  | { type: "diagram"; svg: string }
  // Annotations (reference other steps by index)
  | { type: "circle"; target: number; color?: string }
  | { type: "underline"; target: number; color?: string }
  | { type: "arrow"; from: number; to: number; label?: string }
  | { type: "box"; target: number; color?: string }
  | { type: "crossOut"; target: number }
  | { type: "highlight"; stepIndex: number; color?: string }
```

### TutorBrainRequest

```typescript
export interface TutorBrainRequest {
  studentMessage: string;
  conversationHistory: ConversationMessage[];
  learningPlan: LearningPlanContext | null;
  studentProfile: StudentProfile;
  canvasState: string;
  contentSteps?: ContentStep[];       // Whiteboard state for context injection
  sandboxContent?: string | null;     // HTML iframe content
  sandboxAccent?: string | null;      // Subject hint
  videoUrl?: string | null;           // Currently playing video
  imageData?: { base64: string; mediaType: string };
  masteryScores?: MasteryScore[];
  modelId?: AIModelId;
  contentMode?: ContentMode;
}
```

### AI Models Supported

```typescript
export type AIModelId =
  | "claude-sonnet-4-5"
  | "claude-haiku-4-5"
  | "gemini-3-pro"
  | "gemini-3-flash"
  | "gpt-4.1-nano"
  | "gpt-5.2-chat";
```

## Next Major Work: Unified Board Migration

The current 5-mode system (steps/math/sandbox/video/welcome) is being replaced with a single scrollable surface with inline content blocks. See `plan.md` in project root and `.claude/plans/` for the detailed migration plan.

## Complexity Tracking

No constitution violations to justify.
