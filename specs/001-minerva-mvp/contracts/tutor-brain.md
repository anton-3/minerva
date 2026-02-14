# Contract: Tutor Brain Module

**Module**: `src/lib/claude/`
**Owner**: Person C (Backend Brain)
**Wraps**: `@anthropic-ai/sdk` v0.74.0

## Interface

```typescript
// Uses CanvasCommand from src/lib/canvas/types.ts

interface TutorBrainRequest {
  studentMessage: string;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
  learningPlan: { subject: string; currentTopic: string; goals: string[] } | null;
  studentProfile: { name: string; age: number; grade: number };
  canvasState: string;
}

interface TutorBrainResponse {
  speech: string;
  canvasCommands?: CanvasCommand[];
  progressUpdate?: { topic: string; score: number };
  internalNotes?: string;
}

interface SessionSummary {
  summary: string;
  topicsCovered: string[];
  strengths: string[];
  areasForImprovement: string[];
  engagementScore: number;
  comprehensionScore: number;
}

interface LearningPlan {
  subject: string;
  topics: { name: string; description: string; prerequisites: string[] }[];
  currentTopic: string;
}

interface TutorBrain {
  respond(request: TutorBrainRequest): Promise<TutorBrainResponse>;
  generateSummary(transcript: { speaker: string; text: string }[]): Promise<SessionSummary>;
  generateLearningPlan(goals: string[], subject: string): Promise<LearningPlan>;
}
```

## Behavior

- `respond()`: Sends student message + full context to Claude. Returns structured JSON with speech, canvas commands, and progress updates. Uses Socratic method system prompt.
- `generateSummary()`: Takes a full session transcript and generates a parent-facing summary with engagement and comprehension scores.
- `generateLearningPlan()`: Takes parent-defined goals and generates an ordered curriculum with prerequisite chains.

## System Prompts (`src/lib/claude/prompts.ts`)

Encodes:
- Socratic teaching method (guiding questions, never direct answers)
- Age-appropriate language for middle school (grades 6-8)
- Canvas command generation (JSON format matching CanvasCommand type)
- Structured JSON output format for `TutorBrainResponse`
- Safety guardrails (stay on topic, age-appropriate, redirect off-topic)

## Constraints

- No `@anthropic-ai/sdk` types leak outside this module.
- All Claude calls use `claude-sonnet-4-20250514` for speed (< 2s response).
- JSON output is parsed with try/catch — malformed responses extract speech via regex fallback.
- Conversation history trimmed to last 20 messages to stay within context limits.
