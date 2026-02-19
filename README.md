# Minerva AI — Lifelike Socratic Education 24/7

**TreeHacks 2026 (Stanford, Feb 14-16)**

Minerva is an AI-powered avatar tutor that teaches through Socratic questioning and interactive visualizations. A lifelike HeyGen avatar converses with students in real time, guided by Claude's reasoning, while rendering math on Desmos/GeoGebra, science simulations in sandboxed HTML, and 3Blue1Brown-style animations via Manim. Parents get an AI-generated dashboard with session summaries, mastery tracking, and learning plans.

---

## Architecture

```
Student speaks  ──>  HeyGen LiveAvatar (ASR via voiceChat)
                           |
                     useTutorBrain hook
                           |
                     POST /api/tutor/respond  (SSE stream)
                           |
                     Vercel AI SDK (streamText + tools)
                           |
            ┌──────────────┼──────────────┐
            v              v              v
       Claude/Gemini/   Tool calls     Manim server
       GPT response     (canvas,       (video gen)
       (speech text)    sandbox,
            |           video,
            v           progress)
       avatar.speak()      |
            |              v
            v         Frontend renders:
       Avatar speaks   - Desmos 2D/3D
       to student      - GeoGebra
                       - HTML sandbox (iframe)
                       - Manim video player
```

### Black Box Design

Every external dependency is wrapped in `src/lib/`. No SDK types leak outside their module. Any module can be rewritten from scratch using only its typed interface.

| Module | Wrapper | SDK |
|--------|---------|-----|
| Avatar | `src/lib/heygen/` | `@heygen/liveavatar-web-sdk` |
| AI Brain | `src/lib/ai/` | `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/openai` |
| Canvas | `src/lib/canvas/` | Desmos API, `react-geogebra` |
| Video | `src/lib/manim/` | Manim server REST API |
| Knowledge | `src/lib/perplexity/` | Perplexity Sonar API |
| Recording | `src/lib/recall/` | Recall.ai REST API |
| Camera | `src/lib/camera/` | Native `getUserMedia` |
| Zoom | `src/lib/zoom/` | `@zoom/videosdk` (disabled) |

### State Management

Single Zustand store (`src/stores/sessionStore.ts`) holds all session state. Only `selectedModel` is persisted to localStorage.

### Database

PostgreSQL via Drizzle ORM with 6 tables:

| Table | Purpose |
|-------|---------|
| `children` | Student profiles (name, age, grade, PIN) |
| `learning_plans` | AI-generated curricula per child per subject |
| `sessions` | Tutoring session records |
| `session_summaries` | AI-generated post-session reports |
| `progress` | Topic mastery scores (0-1) |
| `transcript_entries` | Conversation transcripts |

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 16.1.6 |
| UI | React | 19.2.3 |
| Language | TypeScript | 5.9.3 |
| Styling | Tailwind CSS v4 + shadcn/ui | 4.0 |
| State | Zustand | 5.0.11 |
| Database | Drizzle ORM + PostgreSQL | 0.45.1 |
| AI | Vercel AI SDK | 6.0.86 |
| Avatar | HeyGen LiveAvatar SDK | 0.0.10 |
| Math | Desmos API + GeoGebra | - |
| Animations | Manim (Python server) | - |
| Charts | Recharts | 3.7.0 |
| Package Manager | pnpm | 10.29.3 |

### AI Models Supported

| Model | Provider | ID |
|-------|----------|----|
| Claude Sonnet 4.5 | Anthropic | `claude-sonnet-4-5-20250929` |
| Claude Haiku 4.5 | Anthropic | `claude-haiku-4-5-20251001` |
| Gemini 3 Pro | Google | `gemini-3-pro-preview` |
| Gemini 3 Flash | Google | `gemini-3-flash-preview` |
| GPT-5 Nano | OpenAI | `gpt-5-nano` |
| GPT-5.2 Chat | OpenAI | `gpt-5.2-chat-latest` |

---

## Project Structure

```
src/
  app/
    page.tsx                     # Landing page
    login/page.tsx               # PIN-based student login + parent demo access
    student/
      page.tsx                   # Student home
      session/page.tsx           # Main tutoring session UI
    parent/
      layout.tsx                 # Sidebar navigation
      page.tsx                   # Dashboard (server component, direct DB)
      children/page.tsx          # Manage child profiles
      goals/page.tsx             # Set goals, generate AI learning plans
      progress/page.tsx          # Mastery charts by subject
      sessions/page.tsx          # Session history with AI summaries
    api/
      tutor/respond/route.ts     # Core brain endpoint (SSE stream)
      tutor/plan/route.ts        # AI learning plan generation
      session/route.ts           # Session CRUD
      session/summary/route.ts   # AI summary generation
      children/route.ts          # Child CRUD
      progress/route.ts          # Mastery score upsert
      learning-plans/route.ts    # Fetch learning plans
      heygen/token/route.ts      # LiveAvatar session tokens
      zoom/token/route.ts        # Zoom JWT tokens
      search/route.ts            # Perplexity Sonar lookup
      recall/bot/route.ts        # Start recording bot
      recall/webhook/route.ts    # Transcript webhook

  components/
    landing/                     # Landing page sections (Hero, FAQ, etc.)
    parent/                      # Dashboard components (ChildCard, ProgressChart, etc.)
    session/                     # Session UI (FloatingVideoOverlay, ContentMode, etc.)
    ui/                          # shadcn/ui primitives

  hooks/
    useSession.ts                # Session lifecycle orchestrator
    useAvatar.ts                 # HeyGen LiveAvatar wrapper
    useTutorBrain.ts             # SSE stream consumer + tool execution
    useCanvas.ts                 # Multi-tool canvas manager
    useUserCamera.ts             # Native getUserMedia
    useZoom.ts                   # Zoom SDK wrapper (disabled)

  lib/
    ai/client.ts                 # Multi-model tutor brain (stream + tools)
    ai/prompts.ts                # Socratic teaching system prompts
    heygen/client.ts             # Avatar client with 5-layer speech pipeline
    canvas/                      # Desmos 2D/3D + GeoGebra tool wrappers
    manim/client.ts              # Manim video generation REST client
    perplexity/client.ts         # Perplexity Sonar knowledge lookup
    recall/client.ts             # Recall.ai recording client
    sandbox/template.ts          # HTML sandbox dark theme wrapper
    camera/                      # Document detection + frame capture
    zoom/                        # Zoom Video SDK wrapper (disabled)

  stores/sessionStore.ts         # Zustand session state
  types/session.ts               # All core type definitions
  db/                            # Drizzle schema, relations, types, seed

manim-server/                    # Python Flask server for Manim animations
  app.py                         # Video generation API
  Dockerfile                     # Docker container config
```

---

## Key Features

### Tutoring Session

- **Real-time avatar conversation** — HeyGen LiveAvatar in FULL mode (rendering + TTS + ASR)
- **Socratic teaching** — Claude guides students with questions, never gives answers directly
- **Multi-model support** — Switch between Claude, Gemini, and GPT mid-session
- **Push-to-talk** — Hold Space to speak, release to send
- **5-layer speech pipeline** — Echo detection, backchannel filtering, noise rejection, barge-in support
- **Auto-session limit** — 9.5-minute timer (before HeyGen's 10-min cap)

### Interactive Visualizations

- **Desmos 2D** — Function graphing, points, sliders, viewport control
- **Desmos 3D** — 3D surface visualization
- **GeoGebra** — Geometry constructions (points, segments, circles, polygons, angles)
- **HTML Sandbox** — Claude generates inline HTML/CSS/JS for science, history, etc.
- **Manim Videos** — 3Blue1Brown-style animations generated server-side

### Parent Dashboard

- **Session summaries** — AI-generated reports with engagement/comprehension scores
- **Mastery tracking** — Per-topic progress charts
- **Learning plans** — AI-generated curricula based on parent goals
- **Child profiles** — PIN-based student authentication

### Document Scanning

- **Camera integration** — Native getUserMedia for webcam
- **"Read" trigger** — Say "read" to capture a photo of homework/textbook
- **Image analysis** — Claude analyzes the captured image and guides the student

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL database (Supabase or local)

### Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
# Database
DATABASE_URL=postgresql://...

# AI Models
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...
OPENAI_API_KEY=sk-...

# HeyGen Avatar
HEYGEN_API_KEY=...
HEYGEN_AVATAR_ID=...
HEYGEN_VOICE_ID=...
HEYGEN_CONTEXT_ID=...
HEYGEN_SANDBOX=true  # Use sandbox avatars for dev

# Optional
PERPLEXITY_API_KEY=pplx-...
RECALL_API_KEY=...
ZOOM_SDK_KEY=...
ZOOM_SDK_SECRET=...
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_MANIM_URL=http://localhost:5001
NEXT_PUBLIC_DESMOS_API_KEY=...
```

### Install & Run

```bash
# Install dependencies
pnpm install

# Push database schema
export DATABASE_URL=<your-database-url>
pnpm db:migrate

# Seed demo data (optional)
npx tsx src/db/seed.ts

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Manim Server (optional)

```bash
cd manim-server
docker build -t manim-server .
docker run -p 5001:5001 --env-file env.example manim-server
```

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/tutor/respond` | POST | Core brain — SSE stream with speech + tool calls |
| `/api/tutor/plan` | POST/GET | Generate/fetch AI learning plans |
| `/api/session` | POST/PATCH/GET | Session CRUD |
| `/api/session/summary` | POST | Generate AI session summary |
| `/api/children` | GET/POST | Child profile CRUD |
| `/api/progress` | GET/POST | Mastery score read/upsert |
| `/api/learning-plans` | GET | Fetch learning plans by child IDs |
| `/api/heygen/token` | POST | Generate LiveAvatar session token |
| `/api/zoom/token` | POST | Generate Zoom Video SDK JWT |
| `/api/search` | POST | Perplexity Sonar knowledge lookup |
| `/api/recall/bot` | POST | Start recording bot |
| `/api/recall/webhook` | POST | Transcript event webhook |

---

## Tool Calling

The tutor brain uses Vercel AI SDK tool calling. Tools are split between client-side and server-side execution:

| Tool | Side | Purpose |
|------|------|---------|
| `executeCanvasCommands` | Client | Draw on Desmos/GeoGebra |
| `showSandbox` | Client | Display HTML content in iframe |
| `setContentMode` | Client | Switch content panel mode |
| `showVideo` | Server | Generate/reuse Manim video |
| `updateProgress` | Server | Write mastery score to DB |
| `getExistingVideos` | Server | List available Manim videos |

---

## Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Production build
pnpm typecheck    # TypeScript check (tsc --noEmit)
pnpm lint         # ESLint
pnpm check        # Lint + typecheck
pnpm db:generate  # Generate Drizzle migrations
pnpm db:migrate   # Run Drizzle migrations
pnpm db:studio    # Open Drizzle Studio
```
