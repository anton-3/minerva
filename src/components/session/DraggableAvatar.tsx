// DraggableAvatar — floating, draggable avatar PiP overlay
// Uses react-rnd for drag behavior. Fixed size, no resize.
// Positioned bottom-right by default, constrained within viewport.

"use client";

import { useRef, useEffect, useState } from "react";
import { Rnd } from "react-rnd";
import type { AvatarStatus } from "@/lib/heygen/types";

interface DraggableAvatarProps {
  status: AvatarStatus;
  onAttach: (element: HTMLVideoElement) => void;
}

const WIDTH = 280;
const HEIGHT = 158; // ~16:9

const statusLabels: Record<AvatarStatus, string> = {
  connecting: "Connecting...",
  connected: "Ready",
  speaking: "Speaking",
  listening: "Listening",
  disconnected: "Disconnected",
};

const statusColors: Record<AvatarStatus, string> = {
  connecting: "bg-yellow-500",
  connected: "bg-green-500",
  speaking: "bg-blue-500",
  listening: "bg-green-500",
  disconnected: "bg-gray-400",
};

export function DraggableAvatar({ status, onAttach }: DraggableAvatarProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const attachedRef = useRef(false);
  const [minimized, setMinimized] = useState(false);

  // Attach the video element once the avatar is connecting or connected
  useEffect(() => {
    if (videoRef.current && !attachedRef.current && status !== "disconnected") {
      onAttach(videoRef.current);
      attachedRef.current = true;
    }
    if (status === "disconnected") {
      attachedRef.current = false;
    }
  }, [status, onAttach]);

  const isActive = status !== "disconnected";

  // Don't render if disconnected
  if (!isActive) return null;

  if (minimized) {
    return (
      <div className="fixed bottom-20 right-4 z-50">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 bg-black/80 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-full shadow-lg hover:bg-black/90 transition-colors"
        >
          <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
          {statusLabels[status]}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <Rnd
      default={{
        x: typeof window !== "undefined" ? window.innerWidth - WIDTH - 16 : 600,
        y: typeof window !== "undefined" ? window.innerHeight - HEIGHT - 88 : 400,
        width: WIDTH,
        height: HEIGHT,
      }}
      minWidth={WIDTH}
      minHeight={HEIGHT}
      maxWidth={WIDTH}
      maxHeight={HEIGHT}
      enableResizing={false}
      bounds="window"
      dragHandleClassName="avatar-drag-handle"
      className="z-50"
    >
      <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-black group">
        {/* Drag handle — top bar */}
        <div className="avatar-drag-handle absolute top-0 left-0 right-0 h-7 bg-gradient-to-b from-black/60 to-transparent z-10 cursor-grab active:cursor-grabbing flex items-center justify-between px-2">
          {/* Status indicator */}
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${statusColors[status]}`} />
            <span className="text-white/80 text-[10px] font-medium">
              {statusLabels[status]}
            </span>
          </div>
          {/* Minimize button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMinimized(true);
            }}
            className="text-white/60 hover:text-white transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Video element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      </div>
    </Rnd>
  );
}
