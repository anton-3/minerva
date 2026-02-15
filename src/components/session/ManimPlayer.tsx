// ManimPlayer — video player for Manim animations
// Plays video URLs provided by the LLM.
// Features: HTML5 video, auto-play, loading state, error handling.

"use client";

import { useRef, useEffect, useState } from "react";

interface ManimPlayerProps {
  url: string;
  autoPlay?: boolean;
  onEnded?: () => void;
}

export function ManimPlayer({
  url,
  autoPlay = true,
  onEnded,
}: ManimPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset state and auto-play when URL changes
  useEffect(() => {
    setLoading(true);
    setError(null);

    if (videoRef.current) {
      videoRef.current.load();
      if (autoPlay) {
        videoRef.current.play().catch((err) => {
          console.warn("[ManimPlayer] Autoplay failed:", err);
        });
      }
    }
  }, [url, autoPlay]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      {/* Loading overlay */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-white/70 text-sm">Loading video...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="flex flex-col items-center gap-3 text-center px-8">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-red-400"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p className="text-white/70 text-sm">Failed to load video</p>
            <p className="text-white/40 text-xs max-w-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        src={url}
        controls
        playsInline
        autoPlay={autoPlay}
        onLoadedData={() => setLoading(false)}
        onError={(e) => {
          setLoading(false);
          setError(
            (e.target as HTMLVideoElement)?.error?.message ||
              "Unknown playback error"
          );
        }}
        onEnded={onEnded}
        className="w-full h-full object-contain"
      />
    </div>
  );
}
