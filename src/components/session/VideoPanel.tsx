// VideoPanel — displays any video URL in the content area
// Used for Manim animations and potentially other video content.

"use client";

import { useCallback } from "react";

interface VideoPanelProps {
  url: string | null;
  onEnded?: () => void;
}

export function VideoPanel({ url, onEnded }: VideoPanelProps) {
  // Reset video to start when loaded (prevents browser from resuming)
  const handleLoadedData = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    e.currentTarget.currentTime = 0;
  }, []);

  if (!url) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-2">🎬</div>
          <p className="text-sm">No video loaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <video
        src={url}
        controls
        autoPlay
        className="max-w-full max-h-full rounded-lg shadow-2xl"
        onLoadedData={handleLoadedData}
        onError={(e) => console.error("[VideoPanel] Video load error:", e)}
        onEnded={onEnded}
      >
        Your browser does not support the video element.
      </video>
    </div>
  );
}
