// Zustand session store — central state for the tutoring session
// See: specs/001-minerva-mvp/plan.md

import { create } from "zustand";
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
} from "@/types/session";

interface SessionActions {
  setStatus: (status: SessionStatus) => void;
  setAvatarStatus: (status: AvatarStatus) => void;
  setSessionId: (id: string) => void;
  setStudentProfile: (profile: StudentProfile) => void;
  setLearningPlan: (plan: LearningPlanContext | null) => void;
  addMessage: (message: ConversationMessage) => void;
  addTranscriptEntry: (entry: TranscriptEntry) => void;
  setContentMode: (mode: ContentMode) => void;
  setManimVideoUrl: (url: string | null) => void;
  setSandboxHtml: (html: string | null) => void;
  setMasteryScores: (scores: MasteryScore[]) => void;
  reset: () => void;
}

const initialState: SessionState = {
  sessionId: null,
  status: "idle",
  avatarStatus: "disconnected",
  conversationHistory: [],
  transcript: [],
  studentProfile: null,
  learningPlan: null,
  contentMode: "math",
  manimVideoUrl: null,
  sandboxHtml: null,
  masteryScores: [],
};

export const useSessionStore = create<SessionState & SessionActions>((set) => ({
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
  setManimVideoUrl: (manimVideoUrl) => set({ manimVideoUrl }),
  setSandboxHtml: (sandboxHtml) => set({ sandboxHtml }),
  setMasteryScores: (masteryScores) => set({ masteryScores }),

  reset: () => set(initialState),
}));
