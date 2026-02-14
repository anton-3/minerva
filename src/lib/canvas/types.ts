// Canvas module — command types
// These types define the interface between Claude's output and tool rendering.
// No external tool types leak outside this module.
// See: specs/001-minerva-mvp/contracts/canvas.md

import type { CanvasCommand, MathTool } from "@/types/session";

// Re-export from central types (single source of truth)
export type { CanvasCommand, MathTool };

export interface CanvasExecutor {
  execute(command: CanvasCommand): string | void;
  executeSequence(commands: CanvasCommand[], delayMs?: number): Promise<void>;
  clear(): void;
  getSnapshot(): string;
}
