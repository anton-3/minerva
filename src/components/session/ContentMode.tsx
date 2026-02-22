// ContentMode — content panel switcher
// Renders the whiteboard (primary) or Desmos/GeoGebra (overlay for interactive graphing).
// Sandbox and video content are now inline blocks on the whiteboard (unified board).

"use client";

import type { ContentMode as ContentModeType, MathTool, ContentStep } from "@/types/session";
import type { ToolManager } from "@/lib/canvas/tools";
import { MathToolPanel } from "./MathToolPanel";
import { StepsPanel } from "./StepsPanel";

interface ContentModeProps {
  mode: ContentModeType;
  toolManager: ToolManager;
  contentSteps: ContentStep[];
  onToolChange?: (tool: MathTool) => void;
}

export function ContentModeView({
  mode,
  toolManager,
  contentSteps,
  onToolChange,
}: ContentModeProps) {
  return (
    <div className="w-full h-full relative">
      {/* Welcome state — shown before session starts (no steps yet) */}
      <div
        className={`absolute inset-0 transition-all duration-500 ${
          mode === "welcome" && contentSteps.length === 0
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <WelcomePanel />
      </div>

      {/* Math mode overlay — Desmos / GeoGebra (interactive graphing via executeCanvasCommands) */}
      <div
        className={`absolute inset-0 transition-all duration-300 ${
          mode === "math" ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <MathToolPanel toolManager={toolManager} onToolChange={onToolChange} />
      </div>

      {/* Unified whiteboard — always present, all content types render inline */}
      <div
        className={`absolute inset-0 transition-all duration-300 ${
          mode === "steps" || mode === "sandbox" || mode === "video"
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <StepsPanel steps={contentSteps} />
      </div>
    </div>
  );
}

function WelcomePanel() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <h2 className="font-display text-2xl font-bold text-text-primary mb-2">
          Welcome to Minerva
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed mb-8">
          Your AI tutor is ready. Ask about anything — from algebra to
          accounting, physics to philosophy, or whatever you&apos;re curious about.
        </p>

        {/* Suggested topics */}
        <div className="flex flex-wrap justify-center gap-2">
          {["Algebra", "Physics", "Economics", "Programming", "World History", "Finance", "Chemistry", "Literature"].map((topic) => (
            <span
              key={topic}
              className="rounded-full px-3 py-1 text-xs bg-neutral-surface border border-border-light text-text-secondary"
            >
              {topic}
            </span>
          ))}
        </div>

        <p className="mt-8 text-text-secondary/40 text-xs">
          Hold <span className="text-brand-primary">Space</span> to talk &middot; Visuals appear automatically
        </p>
      </div>
    </div>
  );
}
