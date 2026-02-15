// ContentMode — extensible content mode switcher
// Renders the appropriate content panel based on the active mode.
// Supports: "welcome" (landing), "math" (Desmos/GeoGebra), "sandbox" (interactive HTML), "manim" (video).

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
  isThinking?: boolean;
  onToolChange?: (tool: MathTool) => void;
  onManimEnded?: () => void;
}

export function ContentModeView({
  mode,
  toolManager,
  manimUrl,
  sandboxHtml,
  isThinking,
  onToolChange,
  onManimEnded,
}: ContentModeProps) {
  return (
    <div className="w-full h-full relative">
      {/* Welcome mode — shown before session or before tutor picks a mode */}
      <div
        className={`absolute inset-0 transition-all duration-500 ${
          mode === "welcome" ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <WelcomePanel />
      </div>

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
        <SandboxPanel html={sandboxHtml} isThinking={isThinking} />
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
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-text-secondary/30 mx-auto mb-4"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <p className="text-text-secondary/60 text-sm">
                No video loaded yet
              </p>
              <p className="text-text-secondary/30 text-xs mt-1">
                The tutor will load a video when appropriate
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WelcomePanel() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        {/* Logo placeholder — replace with actual logo asset */}
        <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-neutral-surface border border-border-light flex items-center justify-center overflow-hidden">
          <span className="text-text-secondary/40 text-xs tracking-wide uppercase">Logo</span>
        </div>

        <h2 className="font-display text-2xl font-bold text-text-primary mb-2">
          Welcome to Minerva
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed mb-8">
          Your AI tutor is ready. Ask about any subject — math, physics,
          chemistry, history, biology, or anything you&apos;re curious about.
        </p>

        {/* Suggested topics */}
        <div className="flex flex-wrap justify-center gap-2">
          {["Algebra", "Physics", "Chemistry", "World History", "Biology", "Economics"].map((topic) => (
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
