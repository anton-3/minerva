// AvatarPanel — renders HeyGen avatar video stream
// Owner: Person B (Media Specialist)
// See: specs/001-minerva-mvp/contracts/avatar.md

"use client";

import { useRef, useEffect } from "react";
import type { AvatarStatus } from "@/lib/heygen/types";

interface AvatarPanelProps {
  stream: MediaStream | null;
  status: AvatarStatus;
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

export function AvatarPanel({ stream, status }: AvatarPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative flex items-center justify-center bg-black rounded-lg aspect-video overflow-hidden">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="text-muted-foreground text-center p-4">
          {status === "connecting" ? (
            <p>Connecting to your tutor...</p>
          ) : (
            <p>Click &quot;Start Session&quot; to begin</p>
          )}
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
