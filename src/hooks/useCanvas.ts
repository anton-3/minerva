// useCanvas hook — manages tldraw canvas + command execution
// Wraps CanvasExecutor for React component consumption.
// See: specs/001-minerva-mvp/contracts/canvas.md

"use client";

import { useRef, useCallback } from "react";
import { createCanvasExecutor, type CanvasExecutor } from "@/lib/canvas/commands";
import type { CanvasCommand } from "@/types/session";

export function useCanvas() {
  const executorRef = useRef<CanvasExecutor | null>(null);

  // Called from CanvasPanel's onMount — receives tldraw Editor instance
  const setEditor = useCallback((editor: unknown) => {
    if (editor) {
      executorRef.current = createCanvasExecutor(editor);
    }
  }, []);

  const executeCommand = useCallback((cmd: CanvasCommand) => {
    if (executorRef.current) return executorRef.current.execute(cmd);
  }, []);

  const executeSequence = useCallback(
    async (cmds: CanvasCommand[], delayMs?: number) => {
      if (executorRef.current) {
        await executorRef.current.executeSequence(cmds, delayMs);
      }
    },
    []
  );

  const clear = useCallback(() => {
    if (executorRef.current) executorRef.current.clear();
  }, []);

  const getSnapshot = useCallback(() => {
    if (executorRef.current) return executorRef.current.getSnapshot();
    return "Canvas is empty.";
  }, []);

  return { setEditor, executeCommand, executeSequence, clear, getSnapshot };
}
