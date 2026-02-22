// BottomControlBar — Floating control buttons at bottom of screen
// Contains: session timer, camera/scan controls, join/leave, chat toggle
// Three floating groups: bottom-left, bottom-center, bottom-right.

"use client";

import { useState, useEffect, useRef } from "react";
import type { SessionStatus } from "@/types/session";
import { useSessionStore } from "@/stores/sessionStore";
import {
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  MessageSquare,
  Eraser,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface BottomControlBarProps {
  status: SessionStatus;
  onStart: () => void;
  onEnd: () => void;
  onClearCanvas: () => void;
  chatOpen: boolean;
  onToggleChat: () => void;
  unreadCount: number;
  // Content mode
  onToggleMode?: () => void;
  currentMode?: string;
  // Camera controls
  cameraActive?: boolean;
  onToggleCamera?: () => void;
  // Auto-hide controls (Zoom/Meet pattern)
  controlsVisible?: boolean;
  onControlsMouseEnter?: () => void;
  onControlsMouseLeave?: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function BottomControlBar({
  status,
  onStart,
  onEnd,
  onClearCanvas,
  chatOpen,
  onToggleChat,
  unreadCount,
  currentMode,
  cameraActive,
  onToggleCamera,
  controlsVisible = true,
  onControlsMouseEnter,
  onControlsMouseLeave,
}: BottomControlBarProps) {
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Session timer
  useEffect(() => {
    if (status === "active") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // Zoom state from store — only show when whiteboard has content
  const zoom = useSessionStore((s) => s.zoom);
  const zoomInStore = useSessionStore((s) => s.zoomIn);
  const zoomOutStore = useSessionStore((s) => s.zoomOut);
  const resetZoom = useSessionStore((s) => s.resetZoom);
  const hasContent = useSessionStore((s) => s.contentSteps.length > 0);

  const isNearLimit = elapsed >= 480;
  const isActive = status === "active";
  const isIdle = status === "idle" || status === "ended" || status === "error";
  const isConnecting = status === "connecting";

  return (
    <>
      {/* Left: Timer / Minerva label — floating bottom-left */}
      <div
        className="fixed bottom-4 left-4 z-40 transition-opacity duration-300 ease-out"
        style={{ opacity: controlsVisible ? 1 : 0, pointerEvents: controlsVisible ? "auto" : "none" }}
        onMouseEnter={onControlsMouseEnter}
        onMouseLeave={onControlsMouseLeave}
      >
        {isActive && (
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-full bg-white/80 backdrop-blur-md border border-gray-200 shadow-sm text-sm font-mono ${
              isNearLimit ? "text-red-500" : "text-gray-600"
            }`}
            style={{ WebkitBackdropFilter: "blur(12px)" }}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isNearLimit ? "bg-red-500 animate-pulse" : "bg-green-500"
              }`}
            />
            {formatTime(elapsed)}
            {isNearLimit && (
              <span className="text-xs text-red-500/80">
                (limit approaching)
              </span>
            )}
          </div>
        )}
        {!isActive && (
          <span className="px-3 py-2 rounded-full bg-white/80 backdrop-blur-md border border-gray-200 shadow-sm text-gray-400 text-sm">
            Minerva
          </span>
        )}
      </div>

      {/* Center: Main controls — floating bottom-center */}
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 transition-opacity duration-300 ease-out"
        style={{ opacity: controlsVisible ? 1 : 0, pointerEvents: controlsVisible ? "auto" : "none" }}
        onMouseEnter={onControlsMouseEnter}
        onMouseLeave={onControlsMouseLeave}
      >
        {/* Join / Leave button — always prominent */}
        {isIdle ? (
          <button
            onClick={onStart}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-brand-primary text-white font-medium hover:bg-brand-primary/90 shadow-soft transition-colors"
          >
            <Phone size={18} />
            Join Session
          </button>
        ) : isConnecting ? (
          <button
            disabled
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-brand-primary/20 text-brand-primary/70 font-medium cursor-not-allowed backdrop-blur-md border border-border-light"
          >
            <Phone size={18} className="animate-pulse" />
            Connecting...
          </button>
        ) : (
          <>
            {/* Camera toggle */}
            {onToggleCamera && (
              <button
                onClick={onToggleCamera}
                className={`p-3 rounded-full backdrop-blur-md border transition-colors ${
                  cameraActive
                    ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20 hover:bg-brand-primary/15"
                    : "bg-white/80 text-text-secondary/40 border-border-light hover:bg-white"
                }`}
                style={{ WebkitBackdropFilter: "blur(12px)" }}
                title={cameraActive ? "Turn off camera" : "Turn on camera"}
              >
                {cameraActive ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
            )}

            {/* Clear canvas — only in math mode */}
            {currentMode === "math" && (
              <button
                onClick={onClearCanvas}
                className="p-3 rounded-full bg-white/80 backdrop-blur-md border border-border-light text-text-secondary hover:bg-white transition-colors"
                style={{ WebkitBackdropFilter: "blur(12px)" }}
                title="Clear canvas"
              >
                <Eraser size={18} />
              </button>
            )}

            {/* Leave button */}
            <button
              onClick={onEnd}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500 text-white text-sm font-medium hover:bg-red-600 shadow-sm transition-colors ml-1"
            >
              <PhoneOff size={16} />
              Leave
            </button>
          </>
        )}
      </div>

      {/* Right: Zoom controls + Chat toggle — floating bottom-right */}
      <div
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 transition-opacity duration-300 ease-out"
        style={{ opacity: controlsVisible ? 1 : 0, pointerEvents: controlsVisible ? "auto" : "none" }}
        onMouseEnter={onControlsMouseEnter}
        onMouseLeave={onControlsMouseLeave}
      >
        {/* Zoom controls — only when whiteboard has content */}
        {hasContent && (
          <div className="flex items-center gap-0.5 bg-white/80 backdrop-blur-md rounded-full border border-gray-200 shadow-sm px-1 py-0.5"
            style={{ WebkitBackdropFilter: "blur(12px)" }}
          >
            <button
              onClick={zoomOutStore}
              className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-neutral-100 rounded-full transition-colors"
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              onClick={resetZoom}
              className="px-1.5 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-neutral-100 rounded-full transition-colors text-xs font-mono min-w-9"
              title="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={zoomInStore}
              className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-neutral-100 rounded-full transition-colors"
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
          </div>
        )}

        {/* Chat toggle */}
        <button
          onClick={onToggleChat}
          className={`relative p-3 rounded-full backdrop-blur-md border transition-colors ${
            chatOpen
              ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20"
              : "bg-white/80 text-text-secondary border-border-light hover:bg-white"
          }`}
          style={{ WebkitBackdropFilter: "blur(12px)" }}
          title="Toggle Chat"
        >
          <MessageSquare size={20} />
          {unreadCount > 0 && !chatOpen && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </>
  );
}
