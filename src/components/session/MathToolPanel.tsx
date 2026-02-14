// MathToolPanel — multi-tool canvas panel with tab switching
// Manages Desmos 2D, Desmos 3D, and GeoGebra tools.
// Students have full interactivity.

"use client";

import { useState, useCallback } from "react";
import { DesmosPanel } from "./DesmosPanel";
import { Desmos3DPanel } from "./Desmos3DPanel";
import { GeoGebraPanel } from "./GeoGebraPanel";
import type { MathTool } from "@/types/session";
import type { ToolManager } from "@/lib/canvas/tools";

interface MathToolPanelProps {
  toolManager: ToolManager;
  onToolChange?: (tool: MathTool) => void;
}

const TOOL_LABELS: Record<MathTool, string> = {
  desmos: "Graphing",
  desmos3d: "3D",
  geogebra: "Geometry",
};

export function MathToolPanel({ toolManager, onToolChange }: MathToolPanelProps) {
  const [activeTool, setActiveTool] = useState<MathTool>(toolManager.activeTool);
  const [toolsReady, setToolsReady] = useState({
    desmos: false,
    desmos3d: false,
    geogebra: false,
  });

  const handleToolChange = useCallback(
    (tool: MathTool) => {
      setActiveTool(tool);
      toolManager.setActiveTool(tool);
      onToolChange?.(tool);
    },
    [toolManager, onToolChange]
  );

  const handleDesmosReady = useCallback(
    (calculator: unknown) => {
      toolManager.desmos.setCalculator(calculator);
      setToolsReady((prev) => ({ ...prev, desmos: true }));
    },
    [toolManager]
  );

  const handleDesmos3DReady = useCallback(
    (calculator: unknown) => {
      toolManager.desmos3d.setCalculator(calculator);
      setToolsReady((prev) => ({ ...prev, desmos3d: true }));
    },
    [toolManager]
  );

  const handleGeoGebraReady = useCallback(
    (api: unknown) => {
      toolManager.geogebra.setAPI(api);
      setToolsReady((prev) => ({ ...prev, geogebra: true }));
    },
    [toolManager]
  );

  return (
    <div className="flex flex-col h-full rounded-lg overflow-hidden border border-border bg-background">
      {/* Tool tabs */}
      <div className="flex border-b border-border bg-muted/50">
        {(["desmos", "desmos3d", "geogebra"] as MathTool[]).map((tool) => (
          <button
            key={tool}
            onClick={() => handleToolChange(tool)}
            className={`
              flex-1 px-4 py-2 text-sm font-medium transition-colors
              ${
                activeTool === tool
                  ? "bg-background text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }
            `}
          >
            {TOOL_LABELS[tool]}
            {toolsReady[tool] && (
              <span className="ml-1 text-xs text-green-500">*</span>
            )}
          </button>
        ))}
      </div>

      {/* Tool panels - all mounted but only one visible */}
      <div className="flex-1 relative">
        <div
          className={`absolute inset-0 ${activeTool === "desmos" ? "block" : "hidden"}`}
        >
          <DesmosPanel onCalculatorReady={handleDesmosReady} />
        </div>

        <div
          className={`absolute inset-0 ${activeTool === "desmos3d" ? "block" : "hidden"}`}
        >
          <Desmos3DPanel onCalculatorReady={handleDesmos3DReady} />
        </div>

        <div
          className={`absolute inset-0 ${activeTool === "geogebra" ? "block" : "hidden"}`}
        >
          <GeoGebraPanel onAppletReady={handleGeoGebraReady} />
        </div>
      </div>
    </div>
  );
}
