# Implementation Plan: Minerva AI Avatar Tutor

**Branch**: `001-minerva-mvp` | **Date**: 2026-02-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-minerva-mvp/spec.md`

## Summary

Build an AI avatar tutor platform where a HeyGen LiveAvatar teaches middle school students via real-time conversation and interactive tldraw whiteboard. Claude API powers the tutor brain (Socratic method + canvas command generation). Perplexity Sonar provides factual grounding. Supabase handles auth + data. Parent dashboard for goal setting and progress tracking. Deployed on Vercel.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js (Next.js runtime)
**Primary Dependencies**: Next.js 16.1 LTS, @heygen/streaming-avatar 2.1.0, tldraw 4.3.1, @anthropic-ai/sdk 0.74.0, @supabase/supabase-js 2.95.3, zustand 5.0.11
**Storage**: Supabase (Postgres + Auth + Realtime)
**Testing**: Manual testing + demo rehearsals (hackathon context)
**Target Platform**: Web browser (desktop + tablet), deployed on Vercel
**Project Type**: Web application (full-stack Next.js)
**Performance Goals**: <5s end-to-end response latency, 3+ minute sustained sessions
**Constraints**: 36-hour hackathon, 4-person team with mixed skills, HeyGen 10-min session limit
**Scale/Scope**: Single-user demo, ~7 pages, ~15 API routes, ~6 black box modules

## Constitution Check

*GATE: Must pass before implementation.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Black Box Interfaces | PASS | Every external dependency wrapped in `src/lib/`. Components communicate via typed interfaces. |
| II. Single Responsibility | PASS | Each module has one owner (one person). Clear ownership boundaries. |
| III. Primitive-First Design | PASS | Core primitives: `TutorResponse`, `CanvasCommand`, `TranscriptEntry`, `SessionState`, `LearningPlan` |
| IV. Interface Simplicity | PASS | One way to do each thing. Semantic types over structural complexity. |
| V. Wrap External Dependencies | PASS | HeyGen, Claude, Perplexity, Recall.ai, Supabase all wrapped in `src/lib/` modules |

## Project Structure

### Documentation (this feature)

```text
specs/001-minerva-mvp/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Research artifacts
├── data-model.md        # Database schema
├── contracts/           # Module interface contracts
│   ├── avatar.md        # Avatar module interface
│   ├── canvas.md        # Canvas module interface
│   ├── tutor-brain.md   # Claude tutor brain interface
│   ├── knowledge.md     # Perplexity knowledge interface
│   └── recorder.md      # Recall.ai recording interface
└── tasks.md             # Implementation tasks
```

### Source Code (repository root)

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
│   └── api/                      # API routes (Next.js Route Handlers)
│       ├── heygen/token/route.ts
│       ├── tutor/respond/route.ts
│       ├── tutor/plan/route.ts
│       ├── search/route.ts
│       ├── recall/bot/route.ts
│       ├── recall/webhook/route.ts
│       ├── session/route.ts
│       ├── session/summary/route.ts
│       └── progress/route.ts
├── components/
│   ├── ui/                       # shadcn/ui (pre-installed)
│   ├── session/                  # Session page components
│   │   ├── AvatarPanel.tsx       # HeyGen avatar video display
│   │   ├── CanvasPanel.tsx       # tldraw whiteboard wrapper
│   │   ├── ChatPanel.tsx         # Text chat sidebar
│   │   └── SessionControls.tsx   # Mic, timer, end session
│   ├── parent/                   # Parent dashboard components
│   │   ├── ChildCard.tsx
│   │   ├── GoalForm.tsx
│   │   ├── ProgressChart.tsx
│   │   └── SessionSummaryCard.tsx
│   └── shared/
│       ├── Header.tsx
│       └── LoadingSpinner.tsx
├── lib/                          # BLACK BOX MODULES (wrapped dependencies)
│   ├── heygen/                   # Avatar module
│   │   ├── client.ts             # StreamingAvatar SDK wrapper
│   │   └── types.ts              # Avatar-specific types
│   ├── claude/                   # Tutor brain module
│   │   ├── client.ts             # Anthropic SDK wrapper
│   │   └── prompts.ts            # System prompts (Socratic method)
│   ├── canvas/                   # Canvas command module
│   │   ├── commands.ts           # Command executor + math templates
│   │   └── types.ts              # CanvasCommand type
│   ├── perplexity/               # Knowledge module
│   │   └── client.ts             # Sonar API wrapper
│   ├── recall/                   # Recording module
│   │   └── client.ts             # Recall.ai API wrapper
│   ├── supabase/                 # Database module
│   │   ├── client.ts             # Browser client
│   │   └── server.ts             # Server client
│   └── utils.ts                  # shadcn/ui utility (pre-existing)
├── hooks/                        # React hooks (compose black box modules)
│   ├── useAvatar.ts              # Avatar lifecycle hook
│   ├── useCanvas.ts              # Canvas editor + commands hook
│   ├── useTutorBrain.ts          # Conversation loop hook
│   └── useSession.ts             # Session state machine hook
├── stores/
│   └── sessionStore.ts           # Zustand session state
└── types/
    ├── session.ts                # Core primitive types
    └── database.ts               # Supabase schema types
```

**Structure Decision**: Full-stack Next.js (single project). All API routes in `src/app/api/`. All wrapped dependencies in `src/lib/`. All shared types in `src/types/`. Components organized by domain (session, parent, shared).

## Black Box Module Contracts

### Avatar Module (`src/lib/heygen/`)

```typescript
// Interface - what other modules see
interface AvatarClient {
  startSession(): Promise<{ stream: MediaStream }>;
  endSession(): Promise<void>;
  speak(text: string): Promise<void>;
  interrupt(): Promise<void>;
  onUserMessage(callback: (text: string) => void): void;
  onStatusChange(callback: (status: "connecting" | "connected" | "speaking" | "listening" | "disconnected") => void): void;
}
```

Wraps `@heygen/streaming-avatar`. No HeyGen types leak outside this module.

### Canvas Module (`src/lib/canvas/`)

```typescript
// Interface - what other modules see
type CanvasCommand =
  | { action: "clear" }
  | { action: "drawEquation"; equation: string; x: number; y: number }
  | { action: "drawNumberLine"; min: number; max: number; y: number }
  | { action: "drawCoordinatePlane"; originX: number; originY: number }
  | { action: "drawAngle"; vertexX: number; vertexY: number; angle: number; label?: string }
  | { action: "drawFraction"; numerator: string; denominator: string; x: number; y: number }
  | { action: "highlight"; id: string; color: string }
  | { action: "createShape"; shape: Record<string, unknown> }

interface CanvasExecutor {
  execute(command: CanvasCommand): string | void;  // returns shape ID if created
  executeSequence(commands: CanvasCommand[], delayMs?: number): Promise<void>;
  clear(): void;
  getSnapshot(): string;  // serialized description for Claude context
}
```

Wraps `tldraw` Editor API. No tldraw types leak outside this module.

### Tutor Brain Module (`src/lib/claude/`)

```typescript
// Interface - what other modules see
interface TutorBrainRequest {
  studentMessage: string;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
  learningPlan: { subject: string; currentTopic: string; goals: string[] } | null;
  studentProfile: { name: string; age: number; grade: number };
  canvasState: string;  // from CanvasExecutor.getSnapshot()
}

interface TutorBrainResponse {
  speech: string;
  canvasCommands?: CanvasCommand[];
  progressUpdate?: { topic: string; score: number };
  internalNotes?: string;
}

interface TutorBrain {
  respond(request: TutorBrainRequest): Promise<TutorBrainResponse>;
  generateSummary(transcript: { speaker: string; text: string }[]): Promise<SessionSummary>;
  generateLearningPlan(goals: string[], subject: string): Promise<LearningPlan>;
}
```

Wraps `@anthropic-ai/sdk`. Contains all system prompts. No Anthropic types leak outside.

### Knowledge Module (`src/lib/perplexity/`)

```typescript
// Interface - what other modules see
interface KnowledgeLookup {
  search(query: string): Promise<{ answer: string; citations: string[] }>;
}
```

Wraps Perplexity Sonar REST API. No Perplexity response types leak outside.

### Recording Module (`src/lib/recall/`)

```typescript
// Interface - what other modules see
interface SessionRecorder {
  startRecording(meetingUrl: string, sessionId: string): Promise<{ botId: string }>;
  stopRecording(botId: string): Promise<{ recordingUrl: string }>;
}
```

Wraps Recall.ai REST API. No Recall types leak outside.

## Team Ownership (4 People)

| Person | Role | Modules Owned | Files Owned |
|--------|------|--------------|-------------|
| A | Session Architect | Session orchestration | `src/app/student/`, `src/hooks/useTutorBrain.ts`, `src/hooks/useSession.ts`, `src/stores/sessionStore.ts` |
| B | Media Specialist | Avatar + Canvas | `src/lib/heygen/`, `src/lib/canvas/`, `src/hooks/useAvatar.ts`, `src/hooks/useCanvas.ts`, `src/components/session/AvatarPanel.tsx`, `src/components/session/CanvasPanel.tsx` |
| C | Backend Brain | Claude + Perplexity + Recall + APIs | `src/app/api/`, `src/lib/claude/`, `src/lib/perplexity/`, `src/lib/recall/` |
| D | Dashboard + Design | Parent dashboard + Auth + UI + Deploy | `src/app/parent/`, `src/app/login/`, `src/components/parent/`, `src/lib/supabase/`, Vercel, DB schema |

## Execution Flow

### Phase 1 (Hours 0-4): Setup + Interface Definition
All 4 people define interfaces for their modules. Write type files. Create placeholder files. No implementation yet.

### Phase 2 (Hours 4-12): P1 Implementation - Core Session Loop
Each person implements their black box module independently. Person A wires them together.

### Phase 3 (Hours 12-24): P2+P3 - Dashboard + Learning Plans
Person D builds parent dashboard. Person C builds learning plan generation. Person A/B polish session UX.

### Phase 4 (Hours 24-36): P4+P5 + Polish
Recording, knowledge retrieval, landing page, demo prep.

## Complexity Tracking

No constitution violations to justify.
