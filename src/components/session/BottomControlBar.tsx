// BottomControlBar — Floating control buttons at bottom of screen
// Contains: session timer, camera/scan controls, join/leave, chat toggle
// Three floating groups: bottom-left, bottom-center, bottom-right.

"use client";

import { useState, useEffect, useRef } from "react";
import type { SessionStatus } from "@/types/session";
import {
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  MessageSquare,
  Monitor,
  Eraser,
  ScanLine,
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
  onScan?: () => void;
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
  onToggleMode,
  currentMode,
  cameraActive,
  onToggleCamera,
  onScan,
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
    <>
      {/* Left: Timer / Minerva label — floating bottom-left */}
      <div className="fixed bottom-4 left-4 z-40">
        {isActive && (
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-full bg-black/60 backdrop-blur-md text-sm font-mono ${
              isNearLimit ? "text-red-400" : "text-[#A78BFA]/80"
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
              <span className="text-xs text-red-400/80">
                (limit approaching)
              </span>
            )}
          </div>
        )}
        {!isActive && (
          <span className="px-3 py-2 rounded-full bg-black/60 backdrop-blur-md text-white/40 text-sm">
            Minerva
          </span>
        )}
      </div>

      {/* Center: Main controls — floating bottom-center */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5">
        {/* Join / Leave button — always prominent */}
        {isIdle ? (
          <button
            onClick={onStart}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#A78BFA] text-[#0C0A14] font-medium hover:bg-[#B89CFF] shadow-lg shadow-[#A78BFA]/30 transition-colors"
          >
            <Phone size={18} />
            Join Session
          </button>
        ) : isConnecting ? (
          <button
            disabled
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-yellow-600/50 text-white/70 font-medium cursor-not-allowed backdrop-blur-md"
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
                className={`p-3 rounded-full backdrop-blur-md transition-colors ${
                  cameraActive
                    ? "bg-white/10 text-white hover:bg-white/15"
                    : "bg-white/5 text-white/40 hover:bg-white/10"
                }`}
                title={cameraActive ? "Turn off camera" : "Turn on camera"}
              >
                {cameraActive ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
            )}

            {/* Scan document — only when camera active */}
            {cameraActive && onScan && (
              <button
                onClick={onScan}
                className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/15 transition-colors"
                title="Scan document"
              >
                <ScanLine size={18} />
              </button>
            )}

            {/* Clear canvas — only in math mode */}
            {currentMode === "math" && (
              <button
                onClick={onClearCanvas}
                className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/15 transition-colors"
                title="Clear canvas"
              >
                <Eraser size={18} />
              </button>
            )}

            {/* Leave button */}
            <button
              onClick={onEnd}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600 text-white text-sm font-medium hover:bg-red-500 shadow-lg shadow-red-600/30 transition-colors ml-1"
            >
              <PhoneOff size={16} />
              Leave
            </button>
          </>
        )}
      </div>

      {/* Right: Chat toggle — floating bottom-right */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-3">
        <button
          onClick={onToggleChat}
          className={`relative p-3 rounded-full backdrop-blur-md transition-colors ${
            chatOpen
              ? "bg-[#A78BFA]/20 text-[#A78BFA]"
              : "bg-black/60 text-white hover:bg-black/80"
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
      </div>
    </>
  );
}
