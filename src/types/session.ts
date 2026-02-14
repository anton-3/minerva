// Core primitive types for Minerva
// These are the "primitives" that flow through the entire system.
// See: specs/001-minerva-mvp/plan.md (Black Box Module Contracts)

// ─── Canvas Commands ────────────────────────────────────────────────────────

export type CanvasCommand =
  | { action: "clear" }
  | { action: "drawEquation"; equation: string; x: number; y: number }
  | { action: "drawNumberLine"; min: number; max: number; y: number }
  | { action: "drawCoordinatePlane"; originX: number; originY: number }
  | { action: "drawAngle"; vertexX: number; vertexY: number; angle: number; label?: string }
  | { action: "drawFraction"; numerator: string; denominator: string; x: number; y: number }
  | { action: "highlight"; id: string; color: string }
  | { action: "createShape"; shape: Record<string, unknown> };

// ─── Tutor Brain ────────────────────────────────────────────────────────────

export interface StudentProfile {
  name: string;
  age: number;
  grade: number;
}

export interface TutorBrainRequest {
  studentMessage: string;
  conversationHistory: ConversationMessage[];
  learningPlan: LearningPlanContext | null;
  studentProfile: StudentProfile;
  canvasState: string;
}

export interface TutorBrainResponse {
  speech: string;
  canvasCommands?: CanvasCommand[];
  progressUpdate?: { topic: string; score: number };
  internalNotes?: string;
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
