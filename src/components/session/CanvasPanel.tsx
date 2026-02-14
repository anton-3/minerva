// CanvasPanel — renders tldraw interactive whiteboard
// Owner: Person B (Media Specialist)
// See: specs/001-minerva-mvp/contracts/canvas.md
//
// tldraw must be dynamically imported (uses browser APIs, no SSR).
// Student canvas is read-only — AI draws via CanvasExecutor.

"use client";

import dynamic from "next/dynamic";

// Dynamic import with SSR disabled — tldraw uses browser APIs
const Tldraw = dynamic(() => import("tldraw").then((m) => m.Tldraw), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-muted">
      <p className="text-muted-foreground text-sm">Loading whiteboard...</p>
    </div>
  ),
});

interface CanvasPanelProps {
  onEditorReady: (editor: unknown) => void;
}

export function CanvasPanel({ onEditorReady }: CanvasPanelProps) {
  return (
    <div className="rounded-lg overflow-hidden h-full min-h-[300px]">
      <Tldraw
        hideUi
        onMount={(editor) => {
          // Set read-only for students — AI toggles off when drawing
          editor.updateInstanceState({ isReadonly: true });
          onEditorReady(editor);
        }}
      />
    </div>
  );
}
