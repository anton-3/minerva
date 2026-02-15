// ContentMode — extensible content mode switcher
// Renders the appropriate content panel based on the active mode.
// Supports: "math" (Desmos/GeoGebra), "sandbox" (interactive HTML), "video" (Manim animations).

"use client";

import type { ContentMode as ContentModeType, MathTool } from "@/types/session";
import type { ToolManager } from "@/lib/canvas/tools";
import { MathToolPanel } from "./MathToolPanel";
import { SandboxPanel } from "./SandboxPanel";
import { VideoPanel } from "./VideoPanel";

interface ContentModeProps {
  mode: ContentModeType;
  toolManager: ToolManager;
  sandboxHtml: string | null;
  videoUrl: string | null;
  onToolChange?: (tool: MathTool) => void;
  onVideoEnded?: () => void;
}

export function ContentModeView({
  mode,
  toolManager,
  sandboxHtml,
  videoUrl,
  onToolChange,
  onVideoEnded,
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
        <SandboxPanel html={sandboxHtml} />
      </div>

      {/* Video mode — Manim animations and other videos */}
      <div
        className={`absolute inset-0 transition-all duration-300 ${
          mode === "video" ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <VideoPanel url={videoUrl} onEnded={onVideoEnded} />
      </div>
    </div>
  );
}
