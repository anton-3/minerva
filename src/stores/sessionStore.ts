// Zustand session store — central state for the tutoring session
// See: specs/001-minerva-mvp/plan.md

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  SessionState,
  SessionStatus,
  AvatarStatus,
  ConversationMessage,
  TranscriptEntry,
  StudentProfile,
  LearningPlanContext,
  ContentMode,
  ContentStep,
  MasteryScore,
  AIModelId,
} from "@/types/session";
import { DEFAULT_MODEL } from "@/types/session";

interface SessionActions {
  setStatus: (status: SessionStatus) => void;
  setErrorMessage: (msg: string | null) => void;
  setAvatarStatus: (status: AvatarStatus) => void;
  setSessionId: (id: string) => void;
  setStudentProfile: (profile: StudentProfile) => void;
  setLearningPlan: (plan: LearningPlanContext | null) => void;
  addMessage: (message: ConversationMessage) => void;
  addTranscriptEntry: (entry: TranscriptEntry) => void;
  setContentMode: (mode: ContentMode) => void;
  setSandboxContent: (content: string | null, accent?: string | null) => void;
  setVideoUrl: (url: string | null) => void;
  addSteps: (steps: ContentStep[]) => void;
  clearSteps: () => void;
  setMasteryScores: (scores: MasteryScore[]) => void;
  setSelectedModel: (model: AIModelId) => void;
  // Zoom controls (shared between StepsPanel and BottomControlBar)
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  reset: () => void;
}

// Extended SessionState with selectedModel, zoom, and error details
interface ExtendedSessionState extends SessionState {
  selectedModel: AIModelId;
  zoom: number;
  errorMessage: string | null;
}

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.1;

const initialState: ExtendedSessionState = {
  sessionId: null,
  status: "idle",
  avatarStatus: "disconnected",
  conversationHistory: [],
  transcript: [],
  studentProfile: null,
  learningPlan: null,
  contentMode: "welcome",
  sandboxContent: null,
  sandboxAccent: null,
  videoUrl: null,
  contentSteps: [],
  masteryScores: [],
  selectedModel: DEFAULT_MODEL,
  zoom: 1,
  errorMessage: null,
};

export const useSessionStore = create<ExtendedSessionState & SessionActions>()(
  persist(
    (set) => ({
      ...initialState,

      setStatus: (status) => set({ status, ...(status !== "error" ? { errorMessage: null } : {}) }),
      setErrorMessage: (errorMessage) => set({ errorMessage }),
      setAvatarStatus: (avatarStatus) => set({ avatarStatus }),
      setSessionId: (sessionId) => set({ sessionId }),
      setStudentProfile: (studentProfile) => set({ studentProfile }),
      setLearningPlan: (learningPlan) => set({ learningPlan }),

      addMessage: (message) =>
        set((state) => ({
          conversationHistory: [...state.conversationHistory, message],
        })),

      addTranscriptEntry: (entry) =>
        set((state) => ({
          transcript: [...state.transcript, entry],
        })),

      setContentMode: (contentMode) => set({ contentMode }),
      setSandboxContent: (sandboxContent, sandboxAccent) => set({ sandboxContent, sandboxAccent: sandboxAccent ?? null }),
      setVideoUrl: (videoUrl) => set({ videoUrl }),
      addSteps: (steps) =>
        set((state) => {
          // Handle "clear" step — reset all steps
          if (steps.some((s) => s.type === "clear")) {
            return { contentSteps: steps.filter((s) => s.type !== "clear") };
          }
          return { contentSteps: [...state.contentSteps, ...steps] };
        }),
      clearSteps: () => set({ contentSteps: [] }),
      setMasteryScores: (masteryScores) => set({ masteryScores }),
      setSelectedModel: (selectedModel) => set({ selectedModel }),

      // Zoom controls
      setZoom: (zoom) => set({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) }),
      zoomIn: () => set((s) => ({ zoom: Math.min(MAX_ZOOM, s.zoom + ZOOM_STEP) })),
      zoomOut: () => set((s) => ({ zoom: Math.max(MIN_ZOOM, s.zoom - ZOOM_STEP) })),
      resetZoom: () => set({ zoom: 1 }),

      reset: () => set({ ...initialState, selectedModel: initialState.selectedModel }),
    }),
    {
      name: "minerva-session",
      // Only persist the model selection, not the full session state
      partialize: (state) => ({ selectedModel: state.selectedModel }),
    }
  )
);
