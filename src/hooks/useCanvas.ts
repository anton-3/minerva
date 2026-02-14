// useCanvas hook — manages multi-tool canvas + command execution
// Wraps ToolManager and CanvasExecutor for React component consumption.
// See: specs/001-minerva-mvp/contracts/canvas.md

"use client";

import { useRef, useCallback, useMemo } from "react";
import { createCanvasExecutor, createToolManager, type ToolManager } from "@/lib/canvas/commands";
import type { CanvasCommand, MathTool } from "@/types/session";
import type { CanvasExecutor } from "@/lib/canvas/types";

export function useCanvas() {
  // Create tool manager once
  const toolManagerRef = useRef<ToolManager | null>(null);
  const executorRef = useRef<CanvasExecutor | null>(null);

  // Lazy initialization of tool manager
  const toolManager = useMemo(() => {
    if (!toolManagerRef.current) {
      toolManagerRef.current = createToolManager();
      executorRef.current = createCanvasExecutor(toolManagerRef.current);
    }
    return toolManagerRef.current;
  }, []);

  const executeCommand = useCallback((cmd: CanvasCommand) => {
    if (executorRef.current) {
      return executorRef.current.execute(cmd);
    }
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
    if (executorRef.current) {
      executorRef.current.clear();
    }
  }, []);

  const getSnapshot = useCallback(() => {
    if (executorRef.current) {
      return executorRef.current.getSnapshot();
    }
    return "Canvas not initialized.";
  }, []);

  const setActiveTool = useCallback((tool: MathTool) => {
    if (toolManagerRef.current) {
      toolManagerRef.current.setActiveTool(tool);
    }
  }, []);

  const getActiveTool = useCallback((): MathTool => {
    return toolManagerRef.current?.activeTool ?? "desmos";
  }, []);

  return {
    // Tool manager for CanvasPanel
    toolManager,
    
    // Canvas executor interface
    executeCommand,
    executeSequence,
    clear,
    getSnapshot,
    
    // Tool switching
    setActiveTool,
    getActiveTool,
  };
}
