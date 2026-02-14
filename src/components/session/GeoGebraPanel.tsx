// GeoGebraPanel — renders GeoGebra Classic applet
// Uses the react-geogebra package for embedding.
// Students have full interactivity.

"use client";

import { useEffect, useRef, useCallback } from "react";
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

  // GeoGebra callback when applet is fully loaded
  const handleAppletLoad = useCallback(() => {
    // The applet API is accessible via window after load
    // react-geogebra provides it through the ref or callback
    if (readyRef.current) return;
    readyRef.current = true;

    // Access the API from the iframe
    // Note: react-geogebra exposes the API through different mechanisms
    // We'll use the global ggbApplet if available
    const checkForApi = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ggb = (window as any).ggbApplet;
      if (ggb) {
        apiRef.current = ggb;
        onAppletReady(ggb);
      } else {
        // Retry after a short delay
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
    <div className="w-full h-full min-h-[400px] bg-white">
      <Geogebra
        id="ggb-element"
        appName="classic"
        width={800}
        height={500}
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
