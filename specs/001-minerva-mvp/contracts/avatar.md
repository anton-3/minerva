# Contract: Avatar Module

**Module**: `src/lib/heygen/`
**Owner**: Person B (Media Specialist)
**Wraps**: `@heygen/streaming-avatar` v2.1.0

## Interface

```typescript
// src/lib/heygen/types.ts
type AvatarStatus = "connecting" | "connected" | "speaking" | "listening" | "disconnected";

// src/lib/heygen/client.ts
interface AvatarClient {
  startSession(): Promise<{ stream: MediaStream }>;
  endSession(): Promise<void>;
  speak(text: string): Promise<void>;
  interrupt(): Promise<void>;
  onUserMessage(callback: (text: string) => void): void;
  onStatusChange(callback: (status: AvatarStatus) => void): void;
}
```

## Behavior

- `startSession()`: Fetches access token from `/api/heygen/token`, initializes StreamingAvatar, starts voice chat. Returns MediaStream for video rendering.
- `endSession()`: Closes WebRTC connection, cleans up resources.
- `speak(text)`: Sends text to avatar for speech synthesis via `REPEAT` task type.
- `interrupt()`: Stops current avatar speech immediately.
- `onUserMessage(cb)`: Fires when student finishes speaking (HeyGen STT transcription via `USER_END_MESSAGE` event).
- `onStatusChange(cb)`: Fires on avatar state transitions. Used by UI to show connection/speaking status.

## Constraints

- HeyGen sessions have a 10-minute timeout. Module must handle reconnection gracefully.
- No HeyGen-specific types (`StreamingAvatar`, `AvatarQuality`, etc.) leak outside this module.
- Token generation happens server-side only (`/api/heygen/token`).

## Error Handling

- Token fetch fails → throw with message, caller shows fallback UI
- WebRTC connection fails → fire `onStatusChange("disconnected")`
- Session timeout → fire `onStatusChange("disconnected")`, caller can restart
