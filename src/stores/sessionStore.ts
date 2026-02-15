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
  MasteryScore,
  AIModelId,
} from "@/types/session";
import { DEFAULT_MODEL } from "@/types/session";

interface SessionActions {
  setStatus: (status: SessionStatus) => void;
  setAvatarStatus: (status: AvatarStatus) => void;
  setSessionId: (id: string) => void;
  setStudentProfile: (profile: StudentProfile) => void;
  setLearningPlan: (plan: LearningPlanContext | null) => void;
  addMessage: (message: ConversationMessage) => void;
  addTranscriptEntry: (entry: TranscriptEntry) => void;
  setContentMode: (mode: ContentMode) => void;
  setSandboxContent: (content: string | null, accent?: string | null) => void;
  setVideoUrl: (url: string | null) => void;
  setMasteryScores: (scores: MasteryScore[]) => void;
  setSelectedModel: (model: AIModelId) => void;
  reset: () => void;
}

// Extended SessionState with selectedModel
interface ExtendedSessionState extends SessionState {
  selectedModel: AIModelId;
}

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
  masteryScores: [],
  selectedModel: DEFAULT_MODEL,
};

export const useSessionStore = create<ExtendedSessionState & SessionActions>()(
  persist(
    (set) => ({
      ...initialState,

      setStatus: (status) => set({ status }),
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
      setMasteryScores: (masteryScores) => set({ masteryScores }),
      setSelectedModel: (selectedModel) => set({ selectedModel }),

      reset: () => set({ ...initialState, selectedModel: initialState.selectedModel }),
    }),
    {
      name: "minerva-session",
      // Only persist the model selection, not the full session state
      partialize: (state) => ({ selectedModel: state.selectedModel }),
    }
  )
);
