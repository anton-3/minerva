// Canvas module — command executor + math templates
// Translates CanvasCommand objects into tldraw Editor API calls.
// No tldraw types leak outside this module.
// See: specs/001-minerva-mvp/contracts/canvas.md

import type { CanvasCommand } from "@/types/session";
import type { CanvasExecutor } from "./types";

export type { CanvasExecutor };

export function createCanvasExecutor(_editor: unknown): CanvasExecutor {
  // TODO: Implement in Phase 3 (T020)
  // - Accept tldraw Editor instance
  // - Implement execute() for each CanvasCommand action
  // - Implement math templates: drawEquation, drawNumberLine, drawCoordinatePlane, drawFraction
  // - Implement executeSequence() with delay for animation
  // - Implement getSnapshot() for Claude context
  throw new Error("CanvasExecutor not yet implemented");
}
