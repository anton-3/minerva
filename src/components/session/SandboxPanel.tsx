// SandboxPanel — renders Claude-generated HTML/CSS/JS in a sandboxed iframe
// Used for non-math subjects: physics sims, chemistry diagrams, history timelines, etc.
// Security: allow-scripts only (no allow-same-origin) — iframe cannot access parent.

"use client";

interface SandboxPanelProps {
  html: string | null;
  loading?: boolean;
}

export function SandboxPanel({ html, loading }: SandboxPanelProps) {
  // Loading state — generating sandbox HTML while avatar speaks
  if (!html && loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-center">
          {/* Pulsing shimmer animation */}
          <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-zinc-100 animate-pulse flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-zinc-300"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-48 bg-zinc-100 rounded animate-pulse mx-auto" />
            <div className="h-3 w-32 bg-zinc-50 rounded animate-pulse mx-auto" />
          </div>
          <p className="text-zinc-400 text-xs mt-4">
            Generating interactive content...
          </p>
        </div>
      </div>
    );
  }

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

  // Force content to fit viewport — no scrolling
  const viewportCss = `<style>html,body{margin:0;padding:0;overflow:hidden;width:100%;height:100vh;max-height:100vh;}</style>`;
  const enrichedHtml = viewportCss + html;

  return (
    <iframe
      srcDoc={enrichedHtml}
      sandbox="allow-scripts"
      className="w-full h-full border-0"
      style={{ background: "#fff" }}
      title="Interactive lesson content"
    />
  );
}
