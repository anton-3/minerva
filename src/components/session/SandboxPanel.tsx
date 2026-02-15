// SandboxPanel — renders Claude-generated content in a sandboxed iframe with Twind
// Uses Twind CDN for Tailwind CSS support. Claude outputs only content body.
// Security: allow-scripts + allow-same-origin for network access to Twind CDN.

"use client";

import { useState, useEffect, useRef } from "react";
import { buildSandboxHtml } from "@/lib/sandbox/template";

interface SandboxPanelProps {
  content: string | null;
  accent: string | null;
}

export function SandboxPanel({ content, accent }: SandboxPanelProps) {
  const [visible, setVisible] = useState(false);
  const prevContent = useRef<string | null>(null);

  // Fade in when new content arrives
  useEffect(() => {
    if (content && content !== prevContent.current) {
      setVisible(false);
      const timer = setTimeout(() => setVisible(true), 50);
      prevContent.current = content;
      return () => clearTimeout(timer);
    }
    if (!content) {
      setVisible(false);
      prevContent.current = null;
    }
  }, [content]);

  if (!content) {
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

  // Build full HTML from content body
  const fullHtml = buildSandboxHtml(content, accent || 'general');

  return (
    <div
      className="w-full h-full transition-opacity duration-500 ease-out"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <iframe
        srcDoc={fullHtml}
        sandbox="allow-scripts allow-same-origin"
        className="w-full h-full border-0"
        style={{ background: "#0a0a0a" }}
        title="Interactive lesson content"
      />
    </div>
  );
}
