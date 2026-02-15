// SandboxPanel — renders Claude-generated HTML/CSS/JS in a sandboxed iframe
// Used for non-math subjects: physics sims, chemistry diagrams, history timelines, etc.
// Security: allow-scripts only (no allow-same-origin) — iframe cannot access parent.

"use client";

interface SandboxPanelProps {
  html: string | null;
}

export function SandboxPanel({ html }: SandboxPanelProps) {
  if (!html) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-zinc-200 mx-auto mb-4"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <p className="text-zinc-400 text-sm">
            Interactive content will appear here
          </p>
          <p className="text-zinc-300 text-xs mt-1">
            Ask about physics, chemistry, history, or any topic
          </p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={html}
      sandbox="allow-scripts"
      className="w-full h-full border-0"
      style={{ background: "#fff" }}
      title="Interactive lesson content"
    />
  );
}
