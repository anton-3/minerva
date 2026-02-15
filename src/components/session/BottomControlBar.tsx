// BottomControlBar — Zoom-style control bar at bottom of screen
// Contains: session timer, mic/camera controls, join/leave, chat toggle, self-view
// Fixed at the bottom of the viewport.

"use client";

import { useState, useEffect, useRef } from "react";
import type { SessionStatus } from "@/types/session";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  MessageSquare,
  Monitor,
  Eraser,
} from "lucide-react";

interface BottomControlBarProps {
  status: SessionStatus;
  onStart: () => void;
  onEnd: () => void;
  onClearCanvas: () => void;
  chatOpen: boolean;
  onToggleChat: () => void;
  unreadCount: number;
  // Zoom self-view
  zoomConnected: boolean;
  zoomIsMuted: boolean;
  onToggleMute: () => void;
  selfViewRef: React.RefObject<HTMLDivElement | null>;
  // Content mode
  onToggleMode?: () => void;
  currentMode?: string;
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
  zoomConnected,
  zoomIsMuted,
  onToggleMute,
  selfViewRef,
  onToggleMode,
  currentMode,
}: BottomControlBarProps) {
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Session timer
  useEffect(() => {
    if (status === "active") {
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

  const isNearLimit = elapsed >= 480;
  const isActive = status === "active";
  const isIdle = status === "idle" || status === "ended" || status === "error";
  const isConnecting = status === "connecting";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-t border-white/10">
        {/* Left: Timer + session info */}
        <div className="flex items-center gap-3 min-w-[200px]">
          {isActive && (
            <div
              className={`flex items-center gap-2 text-sm font-mono ${
                isNearLimit ? "text-red-400" : "text-white/70"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isNearLimit ? "bg-red-500 animate-pulse" : "bg-green-500"
                }`}
              />
              {formatTime(elapsed)}
              {isNearLimit && (
                <span className="text-xs text-red-400/80">
                  (limit approaching)
                </span>
              )}
            </div>
          )}
          {!isActive && (
            <span className="text-white/40 text-sm">Minerva</span>
          )}
        </div>

        {/* Center: Main controls */}
        <div className="flex items-center gap-2">
          {/* Mic toggle */}
          {isActive && (
            <button
              onClick={onToggleMute}
              className={`p-3 rounded-full transition-colors ${
                zoomIsMuted
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
              title={zoomIsMuted ? "Unmute" : "Mute"}
            >
              {zoomIsMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          )}

          {/* Camera toggle (placeholder for future) */}
          {isActive && zoomConnected && (
            <button
              className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              title="Camera"
            >
              <Video size={20} />
            </button>
          )}

          {/* Clear canvas */}
          {isActive && (
            <button
              onClick={onClearCanvas}
              className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              title="Clear Canvas"
            >
              <Eraser size={20} />
            </button>
          )}

          {/* Content mode toggle */}
          {isActive && onToggleMode && (
            <button
              onClick={onToggleMode}
              className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              title={`Switch to ${currentMode === "math" ? "Video" : "Math"} mode`}
            >
              <Monitor size={20} />
            </button>
          )}

          {/* Join / Leave button */}
          {isIdle ? (
            <button
              onClick={onStart}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-green-600 text-white font-medium hover:bg-green-500 transition-colors"
            >
              <Phone size={18} />
              Join Session
            </button>
          ) : isConnecting ? (
            <button
              disabled
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-yellow-600/50 text-white/70 font-medium cursor-not-allowed"
            >
              <Phone size={18} className="animate-pulse" />
              Connecting...
            </button>
          ) : (
            <button
              onClick={onEnd}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 text-white font-medium hover:bg-red-500 transition-colors"
            >
              <PhoneOff size={18} />
              Leave
            </button>
          )}
        </div>

        {/* Right: Chat toggle + Self-view */}
        <div className="flex items-center gap-3 min-w-[200px] justify-end">
          {/* Chat toggle */}
          <button
            onClick={onToggleChat}
            className={`relative p-3 rounded-full transition-colors ${
              chatOpen
                ? "bg-blue-500/20 text-blue-400"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
            title="Toggle Chat"
          >
            <MessageSquare size={20} />
            {unreadCount > 0 && !chatOpen && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Self-view thumbnail in control bar */}
          {zoomConnected && (
            <div
              ref={selfViewRef}
              className="w-[80px] h-[45px] rounded-lg border border-white/20 bg-black overflow-hidden [&_video-player]:w-full [&_video-player]:h-full"
            />
          )}
        </div>
      </div>
    </div>
  );
}
