// ContentMode — extensible content mode switcher
// Renders the appropriate content panel based on the active mode.
// Supports: "welcome" (landing), "math" (Desmos/GeoGebra), "sandbox" (interactive HTML), "video" (Manim animations).

"use client";

import type { ContentMode as ContentModeType, MathTool } from "@/types/session";
import type { ToolManager } from "@/lib/canvas/tools";
import { MathToolPanel } from "./MathToolPanel";
import { SandboxPanel } from "./SandboxPanel";
import { VideoPanel } from "./VideoPanel";

interface ContentModeProps {
  mode: ContentModeType;
  toolManager: ToolManager;
  sandboxContent: string | null;
  sandboxAccent: string | null;
  videoUrl: string | null;
  onToolChange?: (tool: MathTool) => void;
  onVideoEnded?: () => void;
}

export function ContentModeView({
  mode,
  toolManager,
  sandboxContent,
  sandboxAccent,
  videoUrl,
  onToolChange,
  onVideoEnded,
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
        <SandboxPanel content={sandboxContent} accent={sandboxAccent} />
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
