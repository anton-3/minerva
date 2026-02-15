// Canvas module — command executor using multi-tool system
// Dispatches CanvasCommand objects to Desmos, Desmos 3D, or GeoGebra.
// No external tool types leak outside this module.
// See: specs/001-minerva-mvp/contracts/canvas.md

import type { CanvasCommand } from "@/types/session";
import type { CanvasExecutor } from "./types";
import { createToolManager, type ToolManager } from "./tools";

export type { CanvasExecutor };

/**
 * Creates a canvas executor that manages multiple math visualization tools.
 * The executor dispatches commands to the appropriate tool based on action prefix.
 */
export function createCanvasExecutor(toolManager: ToolManager): CanvasExecutor {
  return {
    execute(command: CanvasCommand): string | void {
      try {
        toolManager.execute(command);
      } catch (err) {
        // Canvas errors never break the session (per contract)
        console.error("[canvas] Error executing command:", err);
      }
    },

    async executeSequence(commands: CanvasCommand[], delayMs = 500) {
      for (const cmd of commands) {
        this.execute(cmd);
        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    },

    clear() {
      toolManager.clearAll();
    },

    getSnapshot(): string {
      return toolManager.getSnapshot();
    },
  };
}

// Re-export for convenience
export { createToolManager, type ToolManager };
