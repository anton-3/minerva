// CanvasPanel — multi-tool math visualization panel
// Wraps MathToolPanel with a ToolManager for AI-controlled drawing.
// See: specs/001-minerva-mvp/contracts/canvas.md

"use client";

import { MathToolPanel } from "./MathToolPanel";
import type { ToolManager } from "@/lib/canvas/tools";
import type { MathTool } from "@/types/session";

interface CanvasPanelProps {
  toolManager: ToolManager;
  onToolChange?: (tool: MathTool) => void;
}

export function CanvasPanel({ toolManager, onToolChange }: CanvasPanelProps) {
  return (
    <div className="rounded-lg overflow-hidden h-full min-h-[300px]">
      <MathToolPanel toolManager={toolManager} onToolChange={onToolChange} />
    </div>
  );
}
