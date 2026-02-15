// Session Page — Video-call style tutoring UI
// Full-screen content with floating Zoom-style video overlay,
// bottom control bar, slide-out chat sheet, and extensible content modes.
// No navbar — Zoom/Google Meet-style immersive experience.

"use client";

import { useEffect, useCallback, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { ContentModeView } from "@/components/session/ContentMode";
import { FloatingVideoOverlay } from "@/components/session/FloatingVideoOverlay";
import { BottomControlBar } from "@/components/session/BottomControlBar";
import { ChatSheet } from "@/components/session/ChatSheet";
import type { ContentMode } from "@/types/session";
import { captureFrame } from "@/lib/camera/scanner";
import { ParticlesBackground } from "@/components/session/ParticlesBackground";

export default function SessionPage() {
  const {
    status,
    avatarStatus,
    isProcessing,
    isThinking,
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
    // User camera
    userCamera,
  } = useSession();

  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [micOpen, setMicOpen] = useState(false);

  // Reset unread count when chat opens
  useEffect(() => {
    if (chatOpen) {
      setUnreadCount(0);
    }
  }, [chatOpen]);

  // Push-to-talk: hold Space to unmute, release to mute.
  // Handles both direct key events AND postMessage from sandboxed iframes
  // (iframes capture focus on click, so parent window misses key events).
  useEffect(() => {
    const pttDown = () => {
      setMicOpen(true);
      avatarUnmute();
    };
    const pttUp = () => {
      setMicOpen(false);
      avatarMute();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      e.preventDefault();
      pttDown();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      e.preventDefault();
      pttUp();
    };

    // Listen for Space key forwarded from sandboxed iframes via postMessage
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type !== "ptt") return;
      if (e.data.action === "down") pttDown();
      else if (e.data.action === "up") pttUp();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("message", handleMessage);
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

  // Handle document scan — send captured frame to Claude Vision
  const handleScan = useCallback(
    (result: { base64: string; mediaType: "image/jpeg" }) => {
      handleTextMessage(
        "I'm showing you my paper — please look at what I've written and help me with it",
        { base64: result.base64, mediaType: result.mediaType }
      );
    },
    [handleTextMessage]
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-neutral-background">
      {/* Animated particle network background — grab effect on mouse move */}
      <ParticlesBackground />
      {/* Light overlay so particles stay subtle behind content */}
      <div className="absolute inset-0 bg-white/30" />

      {/* Main content area — full screen */}
      <main className="absolute inset-0">
        <ContentModeView
          mode={contentMode}
          toolManager={toolManager}
          manimUrl={manimVideoUrl}
          sandboxHtml={sandboxHtml}
          isThinking={isThinking}
          onToolChange={setActiveTool}
          onManimEnded={() => setContentMode("math")}
        />
      </main>

      {/* Floating Zoom-style video overlay */}
      <FloatingVideoOverlay
        avatarStatus={avatarStatus}
        onAttachAvatar={attach}
        userCamera={userCamera}
        onScan={handleScan}
        isThinking={isThinking}
      />

      {/* Bottom control bar */}
      <BottomControlBar
        status={status}
        onStart={startSession}
        onEnd={endSession}
        onClearCanvas={clearCanvas}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen((prev) => !prev)}
        unreadCount={unreadCount}
        onToggleMode={handleToggleMode}
        currentMode={contentMode}
        cameraActive={userCamera.isActive}
        onToggleCamera={() => {
          if (userCamera.isActive) {
            userCamera.stopCamera();
          } else {
            userCamera.startCamera();
          }
        }}
        onScan={() => {
          if (userCamera.videoRef.current) {
            const result = captureFrame(userCamera.videoRef.current);
            if (result) handleScan(result);
          }
        }}
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
        <div className="pointer-events-none absolute inset-x-0 bottom-[72px] flex justify-center">
          <div
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-150 ${
              micOpen
                ? "bg-brand-primary text-white scale-105"
                : "bg-neutral-surface text-text-secondary border border-border-light"
            }`}
          >
            {micOpen ? "Listening..." : "Hold Space to talk"}
          </div>
        </div>
      )}
    </div>
  );
}
