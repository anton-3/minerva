// Desmos3DPanel — renders Desmos 3D Calculator
// Loads the Desmos API script via shared loader and creates an embedded 3D calculator.
// Students have full interactivity.

"use client";

import { useEffect, useRef } from "react";
import { loadDesmosScript } from "@/lib/canvas/desmos-loader";

interface Desmos3DPanelProps {
  onCalculatorReady: (calculator: unknown) => void;
  apiKey?: string;
}

export function Desmos3DPanel({ onCalculatorReady, apiKey }: Desmos3DPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const calculatorRef = useRef<unknown>(null);

  useEffect(() => {
    let destroyed = false;

    function initCalculator() {
      if (destroyed || !containerRef.current || !window.Desmos?.Calculator3D || calculatorRef.current) return;

      try {
        const calculator = window.Desmos.Calculator3D(containerRef.current, {
          expressions: true,
          settingsMenu: false,
          zoomButtons: true,
          border: false,
          keypad: true,
        });

        calculatorRef.current = calculator;
        onCalculatorReady(calculator);
      } catch (err) {
        console.error("[desmos3d] Failed to create 3D calculator:", err);
      }
    }

    loadDesmosScript(apiKey).then(initCalculator).catch((err) => {
      console.error("[desmos3d] Script load failed:", err);
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
