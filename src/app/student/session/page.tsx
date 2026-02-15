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
    avatarMute,
    avatarUnmute,
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
  const [micOpen, setMicOpen] = useState(false);

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

  // Push-to-talk: hold Space to unmute, release to mute
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      // Don't intercept when typing in an input, textarea, or contentEditable
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

      e.preventDefault();
      setMicOpen(true);
      avatarUnmute();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

      e.preventDefault();
      setMicOpen(false);
      avatarMute();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [avatarMute, avatarUnmute]);

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

      {/* Push-to-talk indicator */}
      {status === "active" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[80px] flex justify-center">
          <div
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-150 ${
              micOpen
                ? "bg-red-500/90 text-white scale-105"
                : "bg-white/10 text-white/60"
            }`}
          >
            {micOpen ? "Listening..." : "Hold Space to talk"}
          </div>
        </div>
      )}
    </div>
  );
}
