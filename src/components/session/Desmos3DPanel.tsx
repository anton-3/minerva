// Desmos3DPanel — renders Desmos 3D Calculator
// Loads the Desmos 3D API script and creates an embedded 3D calculator.
// Students have full interactivity.

"use client";

import { useEffect, useRef } from "react";

interface Desmos3DPanelProps {
  onCalculatorReady: (calculator: unknown) => void;
  apiKey?: string;
}

export function Desmos3DPanel({ onCalculatorReady, apiKey }: Desmos3DPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const calculatorRef = useRef<unknown>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Load Desmos script if not already loaded
    if (!scriptLoadedRef.current && !window.Desmos?.Calculator3D) {
      const script = document.createElement("script");
      const key = apiKey || process.env.NEXT_PUBLIC_DESMOS_API_KEY || "dcb31709b452b1cf9dc26972add0fda6";
      // 3D API uses a different endpoint
      script.src = `https://www.desmos.com/api/v1.11/calculator.js?apiKey=${key}`;
      script.async = true;
      script.onload = () => {
        scriptLoadedRef.current = true;
        initCalculator();
      };
      script.onerror = () => {
        console.error("[desmos3d] Failed to load Desmos API script");
      };
      document.head.appendChild(script);
    } else if (window.Desmos && typeof window.Desmos.Calculator3D === "function") {
      initCalculator();
    }

    function initCalculator() {
      if (!containerRef.current || !window.Desmos?.Calculator3D || calculatorRef.current) return;

      try {
        const calculator = window.Desmos.Calculator3D(containerRef.current, {
          // Full interactivity enabled
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

    return () => {
      // Cleanup on unmount
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
