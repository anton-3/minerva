// useSpeechRecognition — browser-native speech-to-text via Web Speech API
// Free, zero-latency streaming, works in Chrome/Edge.
// Returns interim + final transcripts. Fires onResult with final text.
// Auto-restarts on silence so the mic stays hot during a session.

"use client";

import { useRef, useCallback, useState } from "react";

// Web Speech API types (not in all TS libs)
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

export function useSpeechRecognition() {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultRef = useRef<((text: string) => void) | null>(null);
  const [isListening, setIsListening] = useState(false);
  const shouldRunRef = useRef(false);
  const pausedRef = useRef(false); // Pause while avatar speaks (echo prevention)

  const start = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("[STT] Web Speech API not supported in this browser");
      return;
    }

    // Stop existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch { /* ignore */ }
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Skip results while paused (avatar is speaking)
      if (pausedRef.current) return;

      // Collect all final results from this batch
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }

      if (finalTranscript.trim().length >= 2 && onResultRef.current) {
        onResultRef.current(finalTranscript.trim());
      }
    };

    recognition.onend = () => {
      // Auto-restart if we're still supposed to be listening
      if (shouldRunRef.current) {
        try {
          recognition.start();
        } catch {
          // May fail if already started — ignore
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (event: { error: string }) => {
      // "no-speech" and "aborted" are expected — auto-restart handles them
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("[STT] Recognition error:", event.error);
      }
    };

    shouldRunRef.current = true;
    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch (err) {
      console.error("[STT] Failed to start:", err);
    }
  }, []);

  const stop = useCallback(() => {
    shouldRunRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Pause/resume — used to block echo while avatar speaks
  const pause = useCallback(() => {
    pausedRef.current = true;
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
  }, []);

  const onResult = useCallback((callback: (text: string) => void) => {
    onResultRef.current = callback;
  }, []);

  return {
    isListening,
    start,
    stop,
    pause,
    resume,
    onResult,
  };
}
