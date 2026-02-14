// useAvatar hook — manages HeyGen avatar lifecycle
// Wraps AvatarClient for React component consumption.
// See: specs/001-minerva-mvp/contracts/avatar.md

"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { createAvatarClient } from "@/lib/heygen/client";
import type { AvatarClient, AvatarStatus } from "@/lib/heygen/types";

export function useAvatar() {
  const clientRef = useRef<AvatarClient | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<AvatarStatus>("disconnected");
  const userMessageCbsRef = useRef<((text: string) => void)[]>([]);

  const startSession = useCallback(async () => {
    const client = createAvatarClient();
    clientRef.current = client;

    client.onStatusChange(setStatus);
    client.onUserMessage((text) => {
      userMessageCbsRef.current.forEach((cb) => cb(text));
    });

    const result = await client.startSession();
    setStream(result.stream);
    return result;
  }, []);

  const endSession = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.endSession();
      clientRef.current = null;
      setStream(null);
      setStatus("disconnected");
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    if (clientRef.current) await clientRef.current.speak(text);
  }, []);

  const interrupt = useCallback(async () => {
    if (clientRef.current) await clientRef.current.interrupt();
  }, []);

  const onUserMessage = useCallback((cb: (text: string) => void) => {
    userMessageCbsRef.current.push(cb);
  }, []);

  useEffect(() => {
    return () => {
      clientRef.current?.endSession().catch(console.error);
    };
  }, []);

  return { stream, status, startSession, endSession, speak, interrupt, onUserMessage };
}
