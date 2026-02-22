// Core primitive types for Minerva
// These are the "primitives" that flow through the entire system.
// See: specs/001-minerva-mvp/plan.md (Black Box Module Contracts)

// ─── AI Models ──────────────────────────────────────────────────────────────
// Supported AI models for the tutor brain

export type AIModelId =
  | "claude-sonnet-4-5-20250929"
  | "claude-haiku-4-5-20251001"
  | "gemini-3-pro-preview"
  | "gemini-3-flash-preview"
  | "gpt-4.1";

export type AIProvider = "anthropic" | "google" | "openai";

export interface AIModelConfig {
  id: AIModelId;
  provider: AIProvider;
  displayName: string;
}

// Only fast models (<3s TTFT) — reasoning models excluded for real-time tutoring
export const AI_MODELS: AIModelConfig[] = [
  { id: "claude-sonnet-4-5-20250929", provider: "anthropic", displayName: "Claude Sonnet 4.5" },
  { id: "claude-haiku-4-5-20251001", provider: "anthropic", displayName: "Claude Haiku 4.5" },
  { id: "gemini-3-pro-preview", provider: "google", displayName: "Gemini 3 Pro" },
  { id: "gemini-3-flash-preview", provider: "google", displayName: "Gemini 3 Flash" },
  { id: "gpt-4.1", provider: "openai", displayName: "GPT-4.1" },
];

export const DEFAULT_MODEL: AIModelId = "claude-sonnet-4-5-20250929";

// ─── Math Tools ─────────────────────────────────────────────────────────────

export type MathTool = "desmos" | "desmos3d" | "geogebra";

// ─── Content Modes ───────────────────────────────────────────────────────────
// Extensible: add new modes here and implement a corresponding panel component

export type ContentMode = "welcome" | "math" | "sandbox" | "video" | "steps";

// ─── Content Steps ──────────────────────────────────────────────────────────
// Structured step-by-step content for guided tutoring (KaTeX + GSAP + Rough.js)

export type ContentStep =
  // Content elements (placed on the board)
  | { type: "clear" }
  | { type: "step"; label?: string; math?: string; text?: string }
  | { type: "diagram"; svg: string }
  | { type: "numberLine"; min: number; max: number; highlights?: number[] }
  | { type: "divider"; label?: string }

  // Inline content blocks (unified board — replaces separate content modes)
  | { type: "graph"; tool: MathTool; expressions?: Array<{ latex: string; id?: string; color?: string }>; viewport?: { left: number; right: number; top: number; bottom: number } }
  | { type: "sandbox"; html: string; accent?: string; height?: number }
  | { type: "video"; url: string; autoPlay?: boolean }
  | { type: "image"; src: string; alt?: string; width?: number }
  | { type: "code"; language: string; code: string }

  // Annotations (overlay on existing content, target by index)
  | { type: "circle"; target: number; color?: string }
  | { type: "underline"; target: number; color?: string }
  | { type: "arrow"; from: number; to: number; label?: string }
  | { type: "box"; target: number; color?: string }
  | { type: "crossOut"; target: number }
  | { type: "highlight"; stepIndex: number; color?: string };

// ─── Canvas Commands ────────────────────────────────────────────────────────
// Multi-tool canvas system supporting Desmos 2D, Desmos 3D, and GeoGebra

export type CanvasCommand =
  // Meta commands
  | { action: "clear" }
  | { action: "setTool"; tool: MathTool }
  
  // Desmos 2D (Graphing Calculator)
  | { action: "desmos.setExpression"; id?: string; latex: string; color?: string; hidden?: boolean }
  | { action: "desmos.removeExpression"; id: string }
  | { action: "desmos.setViewport"; left: number; right: number; top: number; bottom: number }
  | { action: "desmos.clear" }
  
  // Desmos 3D
  | { action: "desmos3d.setExpression"; id?: string; latex: string; color?: string }
  | { action: "desmos3d.removeExpression"; id: string }
  | { action: "desmos3d.clear" }
  
  // GeoGebra (geometry constructions)
  | { action: "geogebra.evalCommand"; command: string }
  | { action: "geogebra.setCoords"; name: string; x: number; y: number }
  | { action: "geogebra.deleteObject"; name: string }
  | { action: "geogebra.clear" }

// ─── Tutor Brain ────────────────────────────────────────────────────────────

export interface StudentProfile {
  name: string;
  age: number;
  grade: number;
}

export interface MasteryScore {
  subject: string;
  topic: string;
  score: number;
}

export interface TutorBrainRequest {
  studentMessage: string;
  conversationHistory: ConversationMessage[];
  learningPlan: LearningPlanContext | null;
  studentProfile: StudentProfile;
  canvasState: string;
  contentSteps?: ContentStep[];
  sandboxContent?: string | null;
  sandboxAccent?: string | null;
  videoUrl?: string | null;
  imageData?: {
    base64: string;
    mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  };
  masteryScores?: MasteryScore[];
  modelId?: AIModelId;
  contentMode?: ContentMode;
}

export interface TutorBrainResponse {
  speech: string;
  canvasCommands?: CanvasCommand[];
  progressUpdate?: { topic: string; score: number; velocity?: "improving" | "plateau" | "struggling" };
  internalNotes?: string;
  contentMode?: ContentMode;
  sandboxContent?: string;  // HTML content body (frontend wraps with Twind template)
  sandboxAccent?: string;   // Subject for accent color: physics, chemistry, biology, history, etc.
  manimVideoFile?: string;  // Reuse existing video by filename (e.g., "abc123.mp4")
  manimPrompt?: string;     // Generate NEW video with this prompt (takes 30-120s)
  videoUrl?: string;        // Full URL to the video (added by server)
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Learning Plan ──────────────────────────────────────────────────────────

export interface LearningPlanContext {
  subject: string;
  currentTopic: string;
  goals: string[];
}

export interface LearningPlanTopic {
  name: string;
  description: string;
  prerequisites: string[];
}

export interface LearningPlan {
  subject: string;
  topics: LearningPlanTopic[];
  currentTopic: string;
}

// ─── Session ────────────────────────────────────────────────────────────────

export type SessionStatus = "idle" | "connecting" | "active" | "ended" | "error";

export type AvatarStatus = "connecting" | "connected" | "speaking" | "listening" | "disconnected";

export interface TranscriptEntry {
  speaker: "student" | "tutor";
  text: string;
  timestamp: Date;
}

export interface SessionState {
  sessionId: string | null;
  status: SessionStatus;
  avatarStatus: AvatarStatus;
  conversationHistory: ConversationMessage[];
  transcript: TranscriptEntry[];
  studentProfile: StudentProfile | null;
  learningPlan: LearningPlanContext | null;
  contentMode: ContentMode;
  sandboxContent: string | null;  // HTML content body for sandbox
  sandboxAccent: string | null;   // Subject accent color
  videoUrl: string | null;
  contentSteps: ContentStep[];    // Step-by-step content (KaTeX + GSAP)
  masteryScores: MasteryScore[];
}

// ─── Session Summary ────────────────────────────────────────────────────────

export interface SessionSummary {
  summary: string;
  topicsCovered: string[];
  strengths: string[];
  areasForImprovement: string[];
  engagementScore: number;
  comprehensionScore: number;
}

// ─── Tool Call Types ─────────────────────────────────────────────────────────
// AI SDK tool calling events for streaming responses

export type TutorToolName =
  | "executeCanvasCommands"
  | "showSandbox"
  | "showVideo"
  | "showSteps"
  | "updateProgress"
  | "setContentMode";

// Tool input types
export interface ExecuteCanvasCommandsInput {
  commands: CanvasCommand[];
}

export interface ShowSandboxInput {
  content: string;
  accent: string;
}

export interface ShowVideoInput {
  existingFile?: string;
  generatePrompt?: string;
}

export interface UpdateProgressInput {
  topic: string;
  score: number;
  velocity?: "improving" | "plateau" | "struggling";
}

export interface SetContentModeInput {
  mode: ContentMode;
}

export interface ShowStepsInput {
  steps: ContentStep[];
}

// Tool result types
export interface ShowVideoResult {
  videoUrl?: string;
  error?: string;
}

export interface UpdateProgressResult {
  success: boolean;
}

// Union type for all tool inputs
export type TutorToolInput =
  | { toolName: "executeCanvasCommands"; input: ExecuteCanvasCommandsInput }
  | { toolName: "showSandbox"; input: ShowSandboxInput }
  | { toolName: "showVideo"; input: ShowVideoInput }
  | { toolName: "showSteps"; input: ShowStepsInput }
  | { toolName: "updateProgress"; input: UpdateProgressInput }
  | { toolName: "setContentMode"; input: SetContentModeInput };
