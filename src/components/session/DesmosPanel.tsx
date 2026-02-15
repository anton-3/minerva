// DesmosPanel — renders Desmos 2D GraphingCalculator
// Loads the Desmos API script via shared loader and creates an embedded calculator.
// Students have full interactivity.

"use client";

import { useEffect, useRef } from "react";
import { loadDesmosScript } from "@/lib/canvas/desmos-loader";

// Global Desmos type (loaded via script)
declare global {
  interface Window {
    Desmos?: {
      GraphingCalculator: (
        element: HTMLElement,
        options?: Record<string, unknown>
      ) => unknown;
      Calculator3D: (
        element: HTMLElement,
        options?: Record<string, unknown>
      ) => unknown;
    };
  }
}

interface DesmosPanelProps {
  onCalculatorReady: (calculator: unknown) => void;
  apiKey?: string;
}

export function DesmosPanel({ onCalculatorReady, apiKey }: DesmosPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const calculatorRef = useRef<unknown>(null);

  useEffect(() => {
    let destroyed = false;

    function initCalculator() {
      if (destroyed || !containerRef.current || !window.Desmos || calculatorRef.current) return;

      try {
        const calculator = window.Desmos.GraphingCalculator(containerRef.current, {
          expressions: true,
          settingsMenu: false,
          zoomButtons: true,
          expressionsTopbar: true,
          pointsOfInterest: true,
          trace: true,
          border: false,
          lockViewport: false,
          images: false,
          folders: false,
          notes: true,
          sliders: true,
          keypad: true,
          graphpaper: true,
          xAxisLabel: "",
          yAxisLabel: "",
        });

        calculatorRef.current = calculator;
        onCalculatorReady(calculator);
      } catch (err) {
        console.error("[desmos] Failed to create calculator:", err);
      }
    }

    loadDesmosScript(apiKey).then(initCalculator).catch((err) => {
      console.error("[desmos] Script load failed:", err);
    });

    return () => {
      destroyed = true;
      if (calculatorRef.current) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (calculatorRef.current as any).destroy?.();
        } catch {
          // Ignore cleanup errors
        }
        calculatorRef.current = null;
      }
    };
  }, [apiKey, onCalculatorReady]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px]"
      style={{ background: "#fff" }}
    />
  );
}
