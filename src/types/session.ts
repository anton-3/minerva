// Core primitive types for Minerva
// These are the "primitives" that flow through the entire system.
// See: specs/001-minerva-mvp/plan.md (Black Box Module Contracts)

// ─── Math Tools ─────────────────────────────────────────────────────────────

export type MathTool = "desmos" | "desmos3d" | "geogebra";

// ─── Content Modes ───────────────────────────────────────────────────────────
// Extensible: add new modes here and implement a corresponding panel component

export type ContentMode = "math" | "sandbox" | "manim";

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
  imageData?: {
    base64: string;
    mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  };
  masteryScores?: MasteryScore[];
}

export interface TutorBrainResponse {
  speech: string;
  canvasCommands?: CanvasCommand[];
  progressUpdate?: { topic: string; score: number; velocity?: "improving" | "plateau" | "struggling" };
  internalNotes?: string;
  manimVideoUrl?: string;
  contentMode?: ContentMode;
  sandboxHtml?: string;
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
  manimVideoUrl: string | null;
  sandboxHtml: string | null;
  sandboxLoading: boolean;
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
