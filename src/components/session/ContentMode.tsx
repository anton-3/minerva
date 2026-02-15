// ContentMode — extensible content mode switcher
// Renders the appropriate content panel based on the active mode.
// Supports: "math" (Desmos/GeoGebra), "sandbox" (interactive HTML), "manim" (video).

"use client";

import type { ContentMode as ContentModeType, MathTool } from "@/types/session";
import type { ToolManager } from "@/lib/canvas/tools";
import { MathToolPanel } from "./MathToolPanel";
import { ManimPlayer } from "./ManimPlayer";
import { SandboxPanel } from "./SandboxPanel";

interface ContentModeProps {
  mode: ContentModeType;
  toolManager: ToolManager;
  manimUrl: string | null;
  sandboxHtml: string | null;
  sandboxLoading?: boolean;
  onToolChange?: (tool: MathTool) => void;
  onManimEnded?: () => void;
}

export function ContentModeView({
  mode,
  toolManager,
  manimUrl,
  sandboxHtml,
  sandboxLoading,
  onToolChange,
  onManimEnded,
}: ContentModeProps) {
  return (
    <div className="w-full h-full relative">
      {/* Math mode — Desmos / GeoGebra */}
      <div
        className={`absolute inset-0 transition-all duration-300 ${
          mode === "math" ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <MathToolPanel toolManager={toolManager} onToolChange={onToolChange} />
      </div>

      {/* Sandbox mode — interactive HTML/CSS/JS */}
      <div
        className={`absolute inset-0 transition-all duration-300 ${
          mode === "sandbox" ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <SandboxPanel html={sandboxHtml} loading={sandboxLoading} />
      </div>

      {/* Manim mode — Video player */}
      <div
        className={`absolute inset-0 transition-all duration-300 ${
          mode === "manim" ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
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
    </div>
  );
}
