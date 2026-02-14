// AvatarPanel — renders LiveAvatar video via attach() pattern
// The LiveAvatar SDK attaches video/audio tracks to the <video> element.

"use client";

import { useRef, useEffect } from "react";
import type { AvatarStatus } from "@/lib/heygen/types";

interface AvatarPanelProps {
  status: AvatarStatus;
  onAttach: (element: HTMLVideoElement) => void;
}

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

export function AvatarPanel({ status, onAttach }: AvatarPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const attachedRef = useRef(false);

  // Attach the video element once the avatar is connecting or connected
  useEffect(() => {
    if (videoRef.current && !attachedRef.current && status !== "disconnected") {
      onAttach(videoRef.current);
      attachedRef.current = true;
    }
    // Reset on disconnect so re-attach works for next session
    if (status === "disconnected") {
      attachedRef.current = false;
    }
  }, [status, onAttach]);

  const isActive = status !== "disconnected";

  return (
    <div className="relative flex items-center justify-center bg-black rounded-lg aspect-video overflow-hidden">
      {isActive ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="text-muted-foreground text-center p-4">
          <p>Click &quot;Start Session&quot; to begin</p>
        </div>
      )}

      {/* Status indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
        <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
        <span className="text-white text-xs font-medium">
          {statusLabels[status]}
        </span>
      </div>
    </div>
  );
}
