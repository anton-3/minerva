// HeyGen avatar module — SDK wrapper
// Wraps @heygen/streaming-avatar. No HeyGen types leak outside.
// See: specs/001-minerva-mvp/contracts/avatar.md

import type { AvatarClient, AvatarStatus } from "./types";

export type { AvatarClient, AvatarStatus };

export function createAvatarClient(): AvatarClient {
  // TODO: Implement in Phase 3 (T017)
  // - Fetch token from /api/heygen/token
  // - Initialize StreamingAvatar
  // - Set up WebRTC connection
  // - Register event listeners (USER_END_MESSAGE, STREAM_READY, etc.)
  throw new Error("AvatarClient not yet implemented");
}
