# Contract: Recording Module

**Module**: `src/lib/recall/`
**Owner**: Person C (Backend Brain)
**Wraps**: Recall.ai REST API

## Interface

```typescript
// src/lib/recall/client.ts
interface SessionRecorder {
  startRecording(meetingUrl: string, sessionId: string): Promise<{ botId: string }>;
  stopRecording(botId: string): Promise<{ recordingUrl: string }>;
}
```

## Behavior

- `startRecording(meetingUrl, sessionId)`: Creates a Recall.ai bot that joins the meeting URL and begins recording + real-time transcription. Returns bot ID for later control.
- `stopRecording(botId)`: Stops recording and returns the URL to the saved recording.

## Webhooks

Recall.ai sends real-time transcript data to `/api/recall/webhook/route.ts`. Each webhook payload contains speaker identity and text, which gets saved to `transcript_entries` table.

## Constraints

- No Recall.ai response types leak outside this module.
- Recording is P4 priority — the tutoring session works without it.
- If Recall.ai is unavailable, transcript is built from HeyGen's `onUserMessage` events and Claude's responses (in-memory fallback stored to Supabase on session end).
