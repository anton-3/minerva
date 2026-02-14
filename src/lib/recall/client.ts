// Recall.ai recording module — REST API wrapper
// Wraps Recall.ai REST API. No Recall types leak outside.
// See: specs/001-minerva-mvp/contracts/recorder.md

export interface SessionRecorder {
  startRecording(meetingUrl: string, sessionId: string): Promise<{ botId: string }>;
  stopRecording(botId: string): Promise<{ recordingUrl: string }>;
}

export function createSessionRecorder(): SessionRecorder {
  // TODO: Implement in Phase 6 (T053)
  // - Create Recall.ai bot via REST API
  // - Start/stop recording
  // - Fallback: in-memory transcript from HeyGen events
  throw new Error("SessionRecorder not yet implemented");
}
