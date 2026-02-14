// SessionControls — mic toggle, session timer, end session button
// Owner: Person A (Session Architect)
// See: specs/001-minerva-mvp/spec.md (edge cases: session timeout, mic denied)

"use client";

import { useState, useEffect, useRef } from "react";
import type { SessionStatus } from "@/types/session";

interface SessionControlsProps {
  status: SessionStatus;
  onStart: () => void;
  onEnd: () => void;
  onClearCanvas: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SessionControls({ status, onStart, onEnd, onClearCanvas }: SessionControlsProps) {
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Session timer — count up while active, warn at 8 min (HeyGen ~10 min limit)
  useEffect(() => {
    if (status === "active") {
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const isNearLimit = elapsed >= 480; // 8 minutes

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-background border border-border rounded-lg">
      {/* Left: session timer */}
      <div className="flex items-center gap-3">
        {status === "active" && (
          <div className={`flex items-center gap-2 text-sm font-mono ${isNearLimit ? "text-red-500" : "text-muted-foreground"}`}>
            <span className={`w-2 h-2 rounded-full ${isNearLimit ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
            {formatTime(elapsed)}
            {isNearLimit && <span className="text-xs">(session limit approaching)</span>}
          </div>
        )}
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center gap-2">
        {status === "active" && (
          <button
            onClick={onClearCanvas}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Clear Canvas
          </button>
        )}

        {status === "idle" || status === "ended" || status === "error" ? (
          <button
            onClick={onStart}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Start Session
          </button>
        ) : status === "connecting" ? (
          <button
            disabled
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground opacity-50"
          >
            Connecting...
          </button>
        ) : (
          <button
            onClick={onEnd}
            className="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            End Session
          </button>
        )}
      </div>
    </div>
  );
}
