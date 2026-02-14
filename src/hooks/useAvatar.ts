// useAvatar hook — manages LiveAvatar session lifecycle (LITE mode)
// Wraps AvatarClient for React component consumption.
// Uses attach() pattern: pass a <video> element and the SDK handles rendering.
// No ASR — STT is handled by useSpeechRecognition (browser Web Speech API).

"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { createAvatarClient } from "@/lib/heygen/client";
import type { AvatarClient, AvatarStatus } from "@/lib/heygen/types";

export function useAvatar() {
  const clientRef = useRef<AvatarClient | null>(null);
  const [status, setStatus] = useState<AvatarStatus>("disconnected");
  const speakingCbsRef = useRef<((isSpeaking: boolean) => void)[]>([]);

  const startSession = useCallback(async () => {
    const client = createAvatarClient();
    clientRef.current = client;

    client.onStatusChange(setStatus);
    client.onSpeakingChange((isSpeaking) => {
      speakingCbsRef.current.forEach((cb) => cb(isSpeaking));
    });

    await client.startSession();
  }, []);

  const endSession = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.endSession();
      clientRef.current = null;
      setStatus("disconnected");
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    if (clientRef.current) await clientRef.current.speak(text);
  }, []);

  const interrupt = useCallback(() => {
    if (clientRef.current) clientRef.current.interrupt();
  }, []);

  const attach = useCallback((element: HTMLMediaElement) => {
    if (clientRef.current) clientRef.current.attach(element);
  }, []);

  const onSpeakingChange = useCallback((cb: (isSpeaking: boolean) => void) => {
    speakingCbsRef.current.push(cb);
  }, []);

  useEffect(() => {
    return () => {
      clientRef.current?.endSession().catch(console.error);
    };
  }, []);

  return { status, startSession, endSession, speak, interrupt, attach, onSpeakingChange };
}
