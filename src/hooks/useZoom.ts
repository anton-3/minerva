// useZoom hook — manages Zoom Video SDK session lifecycle
// Wraps createZoomClient for React component consumption.
// The student joins a Zoom session; the HeyGen avatar renders separately.

"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { createZoomClient } from "@/lib/zoom/client";
import type { ZoomClient, ZoomSessionStatus } from "@/lib/zoom/types";

export function useZoom() {
  const clientRef = useRef<ZoomClient | null>(null);
  const [status, setStatus] = useState<ZoomSessionStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);

  const joinSession = useCallback(async (topic: string, userName: string) => {
    const client = await createZoomClient();
    clientRef.current = client;

    client.onStatusChange(setStatus);

    // Fetch JWT token from our server
    const tokenRes = await fetch("/api/zoom/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, role: 1 }),
    });

    if (!tokenRes.ok) {
      throw new Error("Failed to fetch Zoom token");
    }

    const { token } = await tokenRes.json();
    await client.joinSession({ topic, token, userName });
  }, []);

  const leaveSession = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.leaveSession();
      clientRef.current = null;
      setStatus("disconnected");
    }
  }, []);

  const startVideo = useCallback(async (container: HTMLElement) => {
    if (clientRef.current) {
      await clientRef.current.startVideo(container);
    }
  }, []);

  const stopVideo = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.stopVideo();
    }
  }, []);

  const startAudio = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.startAudio();
    }
  }, []);

  const toggleMute = useCallback(async () => {
    if (clientRef.current) {
      const muted = await clientRef.current.toggleMute();
      setIsMuted(muted);
      return muted;
    }
    return false;
  }, []);

  const setMuted = useCallback(async (value: boolean) => {
    if (clientRef.current) {
      await clientRef.current.setMuted(value);
      setIsMuted(value);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clientRef.current?.leaveSession().catch(console.error);
    };
  }, []);

  return {
    status,
    isMuted,
    joinSession,
    leaveSession,
    startVideo,
    stopVideo,
    startAudio,
    toggleMute,
    setMuted,
  };
}
