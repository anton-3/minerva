// useAvatar hook — manages LiveAvatar session lifecycle (LITE mode)
// Wraps AvatarClient for React component consumption.
// Uses attach() pattern: pass a <video> element and the SDK handles rendering.
// LITE mode: HeyGen provides avatar rendering + lip-sync only.
// ASR is Deepgram (separate hook). TTS is ElevenLabs (server-side).

"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { createAvatarClient } from "@/lib/heygen/client";
import type { AvatarClient, AvatarStatus } from "@/lib/heygen/types";

export function useAvatar() {
  const clientRef = useRef<AvatarClient | null>(null);
  const [status, setStatus] = useState<AvatarStatus>("disconnected");

  const startSession = useCallback(async () => {
    const client = createAvatarClient();
    clientRef.current = client;

    client.onStatusChange(setStatus);

    await client.startSession();
  }, []);

  const endSession = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.endSession();
      clientRef.current = null;
      setStatus("disconnected");
    }
  }, []);

  // speak(text) — text-only fallback for display/logging
  const speak = useCallback(async (text: string) => {
    if (clientRef.current) await clientRef.current.speak(text);
  }, []);

  // speakAudio(base64) — send Base64-encoded PCM 24kHz audio to avatar for lip-sync
  const speakAudio = useCallback(async (pcmBase64: string) => {
    if (clientRef.current) await clientRef.current.speakAudio(pcmBase64);
  }, []);

  const interrupt = useCallback(() => {
    if (clientRef.current) clientRef.current.interrupt();
  }, []);

  const attach = useCallback((element: HTMLMediaElement) => {
    if (clientRef.current) clientRef.current.attach(element);
  }, []);

  const muteAvatarAudio = useCallback(() => {
    if (clientRef.current) clientRef.current.muteAvatarAudio();
  }, []);

  const unmuteAvatarAudio = useCallback(() => {
    if (clientRef.current) clientRef.current.unmuteAvatarAudio();
  }, []);

  useEffect(() => {
    return () => {
      clientRef.current?.endSession().catch(console.error);
    };
  }, []);

  return {
    status,
    startSession,
    endSession,
    speak,
    speakAudio,
    interrupt,
    attach,
    muteAvatarAudio,
    unmuteAvatarAudio,
  };
}
