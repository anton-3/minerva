// Canvas module — command types
// These types define the interface between Claude's output and tldraw rendering.
// No tldraw types leak outside this module.
// See: specs/001-minerva-mvp/contracts/canvas.md

// Re-export from central types (single source of truth)
export type { CanvasCommand } from "@/types/session";

export interface CanvasExecutor {
  execute(command: import("@/types/session").CanvasCommand): string | void;
  executeSequence(commands: import("@/types/session").CanvasCommand[], delayMs?: number): Promise<void>;
  clear(): void;
  getSnapshot(): string;
}
