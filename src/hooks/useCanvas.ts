// useCanvas hook — manages tldraw canvas + command execution
// Wraps CanvasExecutor for React component consumption.
// See: specs/001-minerva-mvp/contracts/canvas.md

"use client";

import type { CanvasCommand } from "@/types/session";

export function useCanvas() {
  // TODO: Implement in Phase 3 (T025)
  // - Accept tldraw Editor ref
  // - Create CanvasExecutor when editor is ready
  // - Expose: executeCommand, executeSequence, clear, getSnapshot

  return {
    editorRef: null,
    executeCommand: (_cmd: CanvasCommand) => {},
    executeSequence: async (_cmds: CanvasCommand[], _delayMs?: number) => {},
    clear: () => {},
    getSnapshot: () => "Canvas is empty",
  };
}
