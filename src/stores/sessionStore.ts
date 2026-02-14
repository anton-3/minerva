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
} from "@/types/session";

interface SessionActions {
  setStatus: (status: SessionStatus) => void;
  setAvatarStatus: (status: AvatarStatus) => void;
  setSessionId: (id: string) => void;
  setStudentProfile: (profile: StudentProfile) => void;
  setLearningPlan: (plan: LearningPlanContext | null) => void;
  addMessage: (message: ConversationMessage) => void;
  addTranscriptEntry: (entry: TranscriptEntry) => void;
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

  reset: () => set(initialState),
}));
