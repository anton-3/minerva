// GeoGebraPanel — renders GeoGebra Classic applet
// Uses the react-geogebra package for embedding.
// Students have full interactivity.

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import dynamic from "next/dynamic";

// Dynamic import of Geogebra component (requires browser)
const Geogebra = dynamic(
  () => import("react-geogebra").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-white">
        <p className="text-muted-foreground text-sm">Loading GeoGebra...</p>
      </div>
    ),
  }
);

interface GeoGebraPanelProps {
  onAppletReady: (api: unknown) => void;
}

export function GeoGebraPanel({ onAppletReady }: GeoGebraPanelProps) {
  const apiRef = useRef<unknown>(null);
  const readyRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // Measure container and respond to resizes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // GeoGebra callback when applet is fully loaded
  const handleAppletLoad = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;

    const checkForApi = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ggb = (window as any).ggbApplet;
      if (ggb) {
        apiRef.current = ggb;
        onAppletReady(ggb);
      } else {
        setTimeout(checkForApi, 100);
      }
    };
    checkForApi();
  }, [onAppletReady]);

  useEffect(() => {
    return () => {
      readyRef.current = false;
      apiRef.current = null;
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full bg-white">
      <Geogebra
        id="ggb-element"
        appName="classic"
        width={dimensions.width}
        height={dimensions.height}
        showToolBar={true}
        showAlgebraInput={true}
        showMenuBar={false}
        enableLabelDrags={true}
        enableShiftDragZoom={true}
        enableRightClick={true}
        showResetIcon={true}
        language="en"
        appletOnLoad={handleAppletLoad}
      />
    </div>
  );
}
