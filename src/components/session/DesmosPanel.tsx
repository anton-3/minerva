// DesmosPanel — renders Desmos 2D GraphingCalculator
// Loads the Desmos API script and creates an embedded calculator.
// Students have full interactivity.

"use client";

import { useEffect, useRef } from "react";

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
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Load Desmos script if not already loaded
    if (!scriptLoadedRef.current && !window.Desmos) {
      const script = document.createElement("script");
      const key = apiKey || process.env.NEXT_PUBLIC_DESMOS_API_KEY || "dcb31709b452b1cf9dc26972add0fda6";
      script.src = `https://www.desmos.com/api/v1.11/calculator.js?apiKey=${key}`;
      script.async = true;
      script.onload = () => {
        scriptLoadedRef.current = true;
        initCalculator();
      };
      script.onerror = () => {
        console.error("[desmos] Failed to load Desmos API script");
      };
      document.head.appendChild(script);
    } else if (window.Desmos) {
      initCalculator();
    }

    function initCalculator() {
      if (!containerRef.current || !window.Desmos || calculatorRef.current) return;

      try {
        const calculator = window.Desmos.GraphingCalculator(containerRef.current, {
          // Full interactivity enabled
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
          // Visual settings
          keypad: true,
          graphpaper: true,
          // Start with a nice viewport
          xAxisLabel: "",
          yAxisLabel: "",
        });

        calculatorRef.current = calculator;
        onCalculatorReady(calculator);
      } catch (err) {
        console.error("[desmos] Failed to create calculator:", err);
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
