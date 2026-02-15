// SandboxPanel — renders Claude-generated HTML/CSS/JS in a sandboxed iframe
// Used for non-math subjects: physics sims, chemistry diagrams, history timelines, etc.
// Security: allow-scripts only (no allow-same-origin) — iframe cannot access parent.

"use client";

import { useState, useEffect, useRef } from "react";

interface SandboxPanelProps {
  html: string | null;
}

export function SandboxPanel({ html }: SandboxPanelProps) {
  const [visible, setVisible] = useState(false);
  const prevHtml = useRef<string | null>(null);

  // Fade in when new HTML arrives
  useEffect(() => {
    if (html && html !== prevHtml.current) {
      setVisible(false);
      const timer = setTimeout(() => setVisible(true), 50);
      prevHtml.current = html;
      return () => clearTimeout(timer);
    }
    if (!html) {
      setVisible(false);
      prevHtml.current = null;
    }
  }, [html]);

  if (!html) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-[#A78BFA]/40 mx-auto mb-4"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <p className="text-white/40 text-sm">
            Interactive content will appear here
          </p>
          <p className="text-white/25 text-xs mt-1">
            Ask about physics, chemistry, history, or any topic
          </p>
        </div>
      </div>
    );
  }

  // Viewport CSS ensures content fills properly — allows scrolling for multi-section pages
  const viewportCss = `<style>
html{margin:0;padding:0;width:100%;min-height:100vh;background:#0a0a0a;}
body{margin:0;padding:5vh 5vw;width:100%;min-height:100vh;background:#0a0a0a;color:rgba(255,255,255,0.9);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;box-sizing:border-box;}
svg{display:block;max-width:100%;max-height:100%;}
canvas{display:block;max-width:100%;max-height:100%;}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}
</style>`;
  const enrichedHtml = viewportCss + html;

  return (
    <div
      className="w-full h-full transition-opacity duration-500 ease-out"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <iframe
        srcDoc={enrichedHtml}
        sandbox="allow-scripts"
        className="w-full h-full border-0"
        style={{ background: "#0a0a0a" }}
        title="Interactive lesson content"
      />
    </div>
  );
}
