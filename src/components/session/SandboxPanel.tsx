// SandboxPanel — renders Claude-generated HTML/CSS/JS in a sandboxed iframe
// Used for non-math subjects: physics sims, chemistry diagrams, history timelines, etc.
// Security: allow-scripts only (no allow-same-origin) — iframe cannot access parent.
// Supports a loading state (shimmer) while visualization generates asynchronously.

"use client";

interface SandboxPanelProps {
  html: string | null;
  loading?: boolean;
}

export function SandboxPanel({ html, loading }: SandboxPanelProps) {
  if (!html) {
    // Loading shimmer — visualization is generating asynchronously
    if (loading) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-white">
          <div className="w-full max-w-md px-8">
            <div className="space-y-4 animate-pulse">
              {/* Title skeleton */}
              <div className="h-6 bg-zinc-200 rounded-md w-3/4 mx-auto" />
              {/* Main visual area skeleton */}
              <div className="h-48 bg-zinc-100 rounded-lg border border-zinc-200" />
              {/* Label skeletons */}
              <div className="flex gap-3 justify-center">
                <div className="h-4 bg-zinc-200 rounded w-20" />
                <div className="h-4 bg-zinc-200 rounded w-16" />
                <div className="h-4 bg-zinc-200 rounded w-24" />
              </div>
            </div>
            <p className="text-zinc-400 text-sm text-center mt-6">
              Generating visualization...
            </p>
          </div>
        </div>
      );
    }

    // Default empty state — no content, not loading
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
