// Session Page — Video-call style tutoring UI
// Full-screen content with floating Zoom-style video overlay,
// bottom control bar, slide-out chat sheet, and extensible content modes.
// No navbar — Zoom/Google Meet-style immersive experience.

"use client";

import { useEffect, useCallback, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { useAutoHide } from "@/hooks/useAutoHide";
import { ContentModeView } from "@/components/session/ContentMode";
import { FloatingVideoOverlay } from "@/components/session/FloatingVideoOverlay";
import { BottomControlBar } from "@/components/session/BottomControlBar";
import { ChatSheet } from "@/components/session/ChatSheet";
import { ModelPicker } from "@/components/session/ModelPicker";
import { ParticlesBackground } from "@/components/session/ParticlesBackground";

export default function SessionPage() {
  const {
    status,
    errorMessage,
    avatarStatus,
    isProcessing,
    isThinking,
    conversationHistory,
    attach,
    muteAvatarAudio,
    unmuteAvatarAudio,
    startSession,
    endSession,
    handleTextMessage,
    // Push-to-talk (Deepgram ASR)
    startListening,
    stopListening,
    // Canvas tools
    toolManager,
    clearCanvas,
    setActiveTool,
    // Content mode
    contentMode,
    contentSteps,
    // User camera
    userCamera,
  } = useSession();

  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [micOpen, setMicOpen] = useState(false);
  const [avatarCollapsed, setAvatarCollapsed] = useState(false);

  // Auto-hide controls — hidden after 2s, revealed by clicking a small tab
  const { visible: controlsVisible, show: showControls, lock: lockControls, unlock: unlockControls } =
    useAutoHide(status === "active");

  // Stable callback for ModelPicker — prevents re-renders from recreating the function
  const handleModelPickerOpen = useCallback((open: boolean) => {
    if (open) lockControls();
    else unlockControls();
  }, [lockControls, unlockControls]);

  // Reset unread count when chat opens
  useEffect(() => {
    if (chatOpen) {
      setUnreadCount(0);
    }
  }, [chatOpen]);

  // Push-to-talk: hold Space to start Deepgram ASR, release to stop + send transcript.
  // Handles both direct key events AND postMessage from sandboxed iframes
  // (iframes capture focus on click, so parent window misses key events).
  // Also mutes avatar audio while spacebar is held to prevent echo.
  useEffect(() => {
    const pttDown = () => {
      setMicOpen(true);
      muteAvatarAudio();      // mute avatar audio so mic doesn't pick it up
      startListening();       // start Deepgram ASR (also interrupts avatar)
    };
    const pttUp = () => {
      setMicOpen(false);
      stopListening();        // stop ASR + send accumulated transcript to brain
      unmuteAvatarAudio();    // restore avatar audio
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

    // Toggle chat with 'C' key
    const handleChatToggle = (e: KeyboardEvent) => {
      if (e.code !== "KeyC" || e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      setChatOpen((prev) => !prev);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("message", handleMessage);
    window.addEventListener("keydown", handleChatToggle);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("keydown", handleChatToggle);
    };
  }, [startListening, stopListening, muteAvatarAudio, unmuteAvatarAudio]);

  const handleNewMessage = useCallback(() => {
    if (!chatOpen) {
      setUnreadCount((prev) => prev + 1);
    }
  }, [chatOpen]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-neutral-background">
      {/* Animated particle network background — grab effect on mouse move */}
      <ParticlesBackground />
      {/* Light overlay so particles stay subtle behind content */}
      <div className="absolute inset-0 bg-white/30" />

      {/* Model picker — top right corner, auto-hides during active session */}
      <div
        className="absolute top-4 right-4 z-50 transition-opacity duration-300 ease-out"
        style={{ opacity: controlsVisible ? 1 : 0, pointerEvents: controlsVisible ? "auto" : "none" }}
        onMouseEnter={lockControls}
        onMouseLeave={unlockControls}
        onKeyDownCapture={(e) => { if (e.code === "Space") e.stopPropagation(); }}
      >
        <ModelPicker
          className="w-[170px] bg-white/80 backdrop-blur-sm"
          onOpenChange={handleModelPickerOpen}
        />
      </div>

      {/* Main content area — full screen */}
      <main className="absolute inset-0">
        <ContentModeView
          mode={contentMode}
          toolManager={toolManager}
          contentSteps={contentSteps}
          onToolChange={setActiveTool}
        />
      </main>

      {/* Floating Zoom-style video overlay */}
      <FloatingVideoOverlay
        avatarStatus={avatarStatus}
        onAttachAvatar={attach}
        userCamera={userCamera}
        isThinking={isThinking}
        collapsed={avatarCollapsed}
        onCollapsedChange={setAvatarCollapsed}
      />

      {/* Bottom control bar — auto-hides during active session */}
      <BottomControlBar
        status={status}
        onStart={startSession}
        onEnd={endSession}
        onClearCanvas={clearCanvas}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen((prev) => !prev)}
        unreadCount={unreadCount}
        currentMode={contentMode}
        cameraActive={userCamera.isActive}
        onToggleCamera={() => {
          if (userCamera.isActive) {
            userCamera.stopCamera();
          } else {
            userCamera.startCamera();
          }
        }}
        controlsVisible={controlsVisible}
        onControlsMouseEnter={lockControls}
        onControlsMouseLeave={unlockControls}
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

      {/* Push-to-talk indicator — auto-hides with controls */}
      {status === "active" && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-[72px] flex justify-center transition-opacity duration-300 ease-out"
          style={{ opacity: controlsVisible ? 1 : 0 }}
        >
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

      {/* Error overlay — shown when session fails to start */}
      {status === "error" && errorMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4 text-center space-y-4">
            <div className="w-10 h-10 mx-auto rounded-full bg-red-50 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-sm text-text-secondary">{errorMessage}</p>
            <button
              onClick={startSession}
              className="px-5 py-2 rounded-full bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Reveal tab — small pill at bottom center, visible only when controls are hidden */}
      {status === "active" && !controlsVisible && (
        <button
          onClick={showControls}
          className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-3 py-1 rounded-full bg-black/20 backdrop-blur-sm text-white/60 text-xs hover:bg-black/40 hover:text-white/90 transition-all duration-200 border border-white/10"
          style={{ WebkitBackdropFilter: "blur(8px)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
          Controls
        </button>
      )}
    </div>
  );
}
