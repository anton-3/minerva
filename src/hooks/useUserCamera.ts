// useUserCamera — native getUserMedia hook for user's webcam
// Replaces Zoom SDK camera (which is commented out).
// Provides video stream for self-view and document scanning.

"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export interface UseUserCamera {
  stream: MediaStream | null;
  isActive: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

export function useUserCamera(): UseUserCamera {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    if (streamRef.current) return; // Already active

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false, // Audio handled by HeyGen
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsActive(true);

      // Auto-attach to video element if available
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("[useUserCamera] Failed to start camera:", err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
      setIsActive(false);

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return { stream, isActive, videoRef, startCamera, stopCamera };
}
