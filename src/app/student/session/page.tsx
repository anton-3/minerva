// Session Page — THE core tutoring experience
// Zoom Video SDK is the primary call framework.
// Layout: Avatar (top-left) + Canvas (top-right) + Chat (right sidebar)
// Controls bar at bottom with mic toggle, timer, end session.
// Owner: Person A (Session Architect)
// See: specs/001-minerva-mvp/tasks.md (T033)

"use client";

import { useRef } from "react";
import { useSession } from "@/hooks/useSession";
import { AvatarPanel } from "@/components/session/AvatarPanel";
import { CanvasPanel } from "@/components/session/CanvasPanel";
import { ChatPanel } from "@/components/session/ChatPanel";
import { SessionControls } from "@/components/session/SessionControls";

export default function SessionPage() {
  const {
    status,
    avatarStatus,
    stream,
    isProcessing,
    conversationHistory,
    zoomStatus,
    isMuted,
    toggleMute,
    startSession,
    endSession,
    handleTextMessage,
    setEditor,
    clearCanvas,
  } = useSession();

  const selfViewRef = useRef<HTMLCanvasElement>(null);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Minerva</h1>
          {zoomStatus === "connected" && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Zoom Connected
            </span>
          )}
        </div>
        <SessionControls
          status={status}
          onStart={startSession}
          onEnd={endSession}
          onClearCanvas={clearCanvas}
        />
      </header>

      {/* Main content — grid: (avatar + self-view) | canvas | chat */}
      <main className="flex-1 grid grid-cols-[1fr_1.5fr_320px] gap-4 p-4 overflow-hidden">
        {/* Left column: Avatar + student self-view */}
        <div className="flex flex-col gap-3 min-h-0">
          {/* AI Avatar (HeyGen) — main view */}
          <div className="flex-1">
            <AvatarPanel stream={stream} status={avatarStatus} />
          </div>

          {/* Student self-view (Zoom) — small PiP */}
          <div className="relative h-32 bg-black rounded-lg overflow-hidden shrink-0">
            <canvas
              ref={selfViewRef}
              width={320}
              height={180}
              className="w-full h-full object-cover"
            />
            {status === "active" && (
              <button
                onClick={toggleMute}
                className={`absolute bottom-2 right-2 rounded-full p-1.5 text-xs ${
                  isMuted
                    ? "bg-red-500 text-white"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {isMuted ? "Unmute" : "Mute"}
              </button>
            )}
            <span className="absolute bottom-2 left-2 text-white text-xs bg-black/50 rounded px-1.5 py-0.5">
              You
            </span>
          </div>
        </div>

        {/* Center: Canvas (whiteboard) */}
        <div className="min-h-0">
          <CanvasPanel onEditorReady={setEditor} />
        </div>

        {/* Right: Chat sidebar */}
        <div className="min-h-0">
          <ChatPanel
            messages={conversationHistory}
            onSendMessage={handleTextMessage}
            isProcessing={isProcessing}
          />
        </div>
      </main>
    </div>
  );
}
