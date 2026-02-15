// ContentMode — extensible content mode switcher
// Renders the appropriate content panel based on the active mode.
// Currently supports: "math" (Desmos/GeoGebra) and "manim" (video).
// To add a new mode: extend ContentMode type, add a case here.

"use client";

import type { ContentMode as ContentModeType, MathTool } from "@/types/session";
import type { ToolManager } from "@/lib/canvas/tools";
import { MathToolPanel } from "./MathToolPanel";
import { ManimPlayer } from "./ManimPlayer";

interface ContentModeProps {
  mode: ContentModeType;
  toolManager: ToolManager;
  manimUrl: string | null;
  onToolChange?: (tool: MathTool) => void;
  onManimEnded?: () => void;
}

export function ContentModeView({
  mode,
  toolManager,
  manimUrl,
  onToolChange,
  onManimEnded,
}: ContentModeProps) {
  return (
    <div className="w-full h-full relative">
      {/* Math mode — Desmos / GeoGebra */}
      <div
        className={`absolute inset-0 ${mode === "math" ? "block" : "hidden"}`}
      >
        <MathToolPanel toolManager={toolManager} onToolChange={onToolChange} />
      </div>

      {/* Manim mode — Video player */}
      <div
        className={`absolute inset-0 ${mode === "manim" ? "block" : "hidden"}`}
      >
        {manimUrl ? (
          <ManimPlayer url={manimUrl} onEnded={onManimEnded} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black/95">
            <div className="text-center">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-white/20 mx-auto mb-4"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <p className="text-white/40 text-sm">
                No video loaded yet
              </p>
              <p className="text-white/20 text-xs mt-1">
                The tutor will load a video when appropriate
              </p>
            </div>
          </div>
        )}
      </div>

      {/*
        To add more modes:
        1. Add the mode to ContentMode type in src/types/session.ts
        2. Add a new <div> block here with the mode check
        3. Create the corresponding panel component
      */}
    </div>
  );
}
