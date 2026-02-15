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
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Measure container and respond to resizes — also resize the GeoGebra applet via API
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const w = Math.floor(rect.width);
        const h = Math.floor(rect.height);
        setDimensions({ width: w, height: h });
        // Resize the live applet via the GeoGebra API (react-geogebra ignores prop updates)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ggb = apiRef.current as any;
        if (ggb?.setSize) {
          ggb.setSize(w, h);
        }
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
        // Force resize to fill container after applet is ready
        const el = containerRef.current;
        if (el && ggb.setSize) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            ggb.setSize(Math.floor(rect.width), Math.floor(rect.height));
          }
        }
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
    <div ref={containerRef} className="w-full h-full bg-white overflow-hidden">
      <Geogebra
        id="ggb-element"
        appName="geometry"
        width={dimensions.width}
        height={dimensions.height}
        showToolBar={true}
        showAlgebraInput={false}
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
