// Session Page — THE core tutoring experience
// Zoom Video SDK provides the call layer (student webcam self-view).
// HeyGen LiveAvatar renders the AI tutor avatar.
// tldraw Canvas is the interactive whiteboard.
// Layout: Avatar (left) + Canvas (center) + Chat (right sidebar)
// Student self-view (small Zoom webcam) overlays bottom-left of avatar panel.

"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { AvatarPanel } from "@/components/session/AvatarPanel";
import { CanvasPanel } from "@/components/session/CanvasPanel";
import { ChatPanel } from "@/components/session/ChatPanel";
import { SessionControls } from "@/components/session/SessionControls";

export default function SessionPage() {
  const {
    status,
    avatarStatus,
    isProcessing,
    conversationHistory,
    attach,
    startSession,
    endSession,
    handleTextMessage,
    setEditor,
    clearCanvas,
    // Zoom
    zoomStatus,
    zoomStartVideo,
    zoomToggleMute,
    zoomIsMuted,
  } = useSession();

  const selfViewRef = useRef<HTMLDivElement>(null);
  const [videoStarted, setVideoStarted] = useState(false);

  // Start Zoom video when connected and container is ready
  const startSelfView = useCallback(async () => {
    if (selfViewRef.current && zoomStatus === "connected" && !videoStarted) {
      try {
        await zoomStartVideo(selfViewRef.current);
        setVideoStarted(true);
      } catch (err) {
        console.warn("[SessionPage] Failed to start Zoom video:", err);
      }
    }
  }, [zoomStatus, zoomStartVideo, videoStarted]);

  useEffect(() => {
    startSelfView();
  }, [startSelfView]);

  // Reset video state on disconnect
  useEffect(() => {
    if (zoomStatus === "disconnected" || zoomStatus === "idle") {
      setVideoStarted(false);
    }
  }, [zoomStatus]);

  const zoomConnected = zoomStatus === "connected";

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Minerva</h1>
          {status === "active" && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Session Active
            </span>
          )}
          {zoomConnected && (
            <span className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 px-2 py-0.5 rounded-full">
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

      {/* Main content — grid: avatar | canvas | chat */}
      <main className="flex-1 grid grid-cols-[1fr_1.5fr_320px] gap-4 p-4 overflow-hidden">
        {/* Left column: AI Avatar + Student self-view overlay */}
        <div className="min-h-0 relative">
          <AvatarPanel status={avatarStatus} onAttach={attach} />

          {/* Student self-view — small Zoom webcam overlay (bottom-left) */}
          {zoomConnected && (
            <div className="absolute bottom-3 left-3 flex flex-col items-start gap-1">
              <video-player-container
                ref={selfViewRef}
                className="block w-[160px] h-[90px] rounded-lg border-2 border-white/30 shadow-lg bg-black overflow-hidden [&_video-player]:w-full [&_video-player]:h-full"
              />
              <button
                onClick={async () => {
                  await zoomToggleMute();
                }}
                className={`text-xs px-2 py-1 rounded-md shadow ${
                  zoomIsMuted
                    ? "bg-red-500 text-white"
                    : "bg-white/80 text-black"
                }`}
              >
                {zoomIsMuted ? "Unmute" : "Mute"}
              </button>
            </div>
          )}
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
