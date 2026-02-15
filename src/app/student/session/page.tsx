// Session Page — Video-call style tutoring UI
// Full-screen layout with draggable avatar PiP, bottom control bar,
// slide-out chat sheet, and extensible content modes (Math / Manim).
// No navbar — Zoom/Google Meet-style immersive experience.

"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { DraggableAvatar } from "@/components/session/DraggableAvatar";
import { ContentModeView } from "@/components/session/ContentMode";
import { BottomControlBar } from "@/components/session/BottomControlBar";
import { ChatSheet } from "@/components/session/ChatSheet";
import type { ContentMode } from "@/types/session";

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
    // Canvas tools
    toolManager,
    clearCanvas,
    setActiveTool,
    // Content mode
    contentMode,
    manimVideoUrl,
    sandboxHtml,
    setContentMode,
    // Zoom
    zoomStatus,
    zoomStartVideo,
    zoomToggleMute,
    zoomIsMuted,
  } = useSession();

  const selfViewRef = useRef<HTMLDivElement>(null);
  const [videoStarted, setVideoStarted] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

  // Reset unread count when chat opens
  useEffect(() => {
    if (chatOpen) {
      setUnreadCount(0);
    }
  }, [chatOpen]);

  const handleNewMessage = useCallback(() => {
    if (!chatOpen) {
      setUnreadCount((prev) => prev + 1);
    }
  }, [chatOpen]);

  const handleToggleMode = useCallback(() => {
    const modes: ContentMode[] = ["math", "sandbox", "manim"];
    const currentIndex = modes.indexOf(contentMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setContentMode(modes[nextIndex]);
  }, [contentMode, setContentMode]);

  const zoomConnected = zoomStatus === "connected";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Main content area — full screen minus bottom bar */}
      <main className="absolute inset-0 bottom-[64px]">
        <ContentModeView
          mode={contentMode}
          toolManager={toolManager}
          manimUrl={manimVideoUrl}
          sandboxHtml={sandboxHtml}
          onToolChange={setActiveTool}
          onManimEnded={() => setContentMode("math")}
        />
      </main>

      {/* Mode indicator badge */}
      <div className="absolute top-3 left-3 z-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white/90">
          <span className={`w-1.5 h-1.5 rounded-full ${
            contentMode === "math" ? "bg-blue-400" :
            contentMode === "sandbox" ? "bg-green-400" :
            "bg-purple-400"
          }`} />
          {contentMode === "math" ? "Math Canvas" :
           contentMode === "sandbox" ? "Interactive" :
           "Video"}
        </span>
      </div>

      {/* Draggable avatar PiP overlay */}
      <DraggableAvatar status={avatarStatus} onAttach={attach} />

      {/* Bottom control bar */}
      <BottomControlBar
        status={status}
        onStart={startSession}
        onEnd={endSession}
        onClearCanvas={clearCanvas}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen((prev) => !prev)}
        unreadCount={unreadCount}
        zoomConnected={zoomConnected}
        zoomIsMuted={zoomIsMuted}
        onToggleMute={async () => {
          await zoomToggleMute();
        }}
        selfViewRef={selfViewRef}
        onToggleMode={handleToggleMode}
        currentMode={contentMode}
      />

      {/* Chat slide-out sheet */}
      <ChatSheet
        open={chatOpen}
        onOpenChange={setChatOpen}
        messages={conversationHistory}
        onSendMessage={handleTextMessage}
        isProcessing={isProcessing}
        onNewMessage={handleNewMessage}
      />
    </div>
  );
}
