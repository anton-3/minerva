// useAvatar hook — manages LiveAvatar session lifecycle
// Wraps AvatarClient for React component consumption.
// Uses attach() pattern: pass a <video> element and the SDK handles rendering.

"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { createAvatarClient } from "@/lib/heygen/client";
import type { AvatarClient, AvatarStatus } from "@/lib/heygen/types";

export function useAvatar() {
  const clientRef = useRef<AvatarClient | null>(null);
  const [status, setStatus] = useState<AvatarStatus>("disconnected");
  const userMessageCbsRef = useRef<((text: string) => void)[]>([]);

  const startSession = useCallback(async () => {
    const client = createAvatarClient();
    clientRef.current = client;

    client.onStatusChange(setStatus);
    client.onUserMessage((text) => {
      userMessageCbsRef.current.forEach((cb) => cb(text));
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

  const onUserMessage = useCallback((cb: (text: string) => void) => {
    userMessageCbsRef.current.push(cb);
  }, []);

  useEffect(() => {
    return () => {
      clientRef.current?.endSession().catch(console.error);
    };
  }, []);

  return { status, startSession, endSession, speak, interrupt, attach, onUserMessage };
}
