// FloatingVideoOverlay — Zoom-style floating PiP window
// Three view modes: strip (thin bar), speaker (one video), gallery (two stacked).
// Uses react-rnd for drag + resize. View-switch icons only visible on hover.
// Sits on top of content at z-50.
//
// IMPORTANT: Both <video> elements are always mounted in the SAME tree position
// to preserve HeyGen stream attachment across minimize/mode changes.

"use client";

import { useRef, useEffect, useState, useCallback, type RefCallback } from "react";
import { Rnd } from "react-rnd";
import type { AvatarStatus } from "@/lib/heygen/types";
import type { UseUserCamera } from "@/hooks/useUserCamera";
import { detectDocument, type DetectionResult } from "@/lib/camera/detector";
import { captureFrame } from "@/lib/camera/scanner";
import { Camera, ScanLine } from "lucide-react";

// ─── Types ───

export type ViewMode = "strip" | "speaker" | "gallery";

interface FloatingVideoOverlayProps {
  avatarStatus: AvatarStatus;
  onAttachAvatar: (element: HTMLVideoElement) => void;
  userCamera: UseUserCamera;
  onScan?: (result: { base64: string; mediaType: "image/jpeg" }) => void;
  isThinking?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

// ─── Dimensions per mode ───

const DIMENSIONS: Record<ViewMode, { width: number; height: number }> = {
  strip: { width: 350, height: 40 },
  speaker: { width: 320, height: 200 },
  gallery: { width: 280, height: 340 },
};

const MIN_SIZES: Record<ViewMode, { width: number; height: number }> = {
  strip: { width: 250, height: 36 },
  speaker: { width: 200, height: 120 },
  gallery: { width: 200, height: 240 },
};

// ─── Status config ───

const statusLabels: Record<AvatarStatus, string> = {
  connecting: "Connecting...",
  connected: "Ready",
  speaking: "Speaking",
  listening: "Listening",
  disconnected: "Offline",
};

const statusColors: Record<AvatarStatus, string> = {
  connecting: "bg-yellow-500",
  connected: "bg-green-500",
  speaking: "bg-blue-500 animate-pulse",
  listening: "bg-green-500",
  disconnected: "bg-gray-500",
};

// ─── View Mode Icons ───

function StripIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="7" width="12" height="2" rx="1" fill={active ? "#3b82f6" : "currentColor"} />
    </svg>
  );
}

function SpeakerIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="3" width="10" height="10" rx="2" fill="none" stroke={active ? "#3b82f6" : "currentColor"} strokeWidth="1.5" />
    </svg>
  );
}

function GalleryIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={3 + col * 4}
            y={3 + row * 4}
            width="2.5"
            height="2.5"
            rx="0.5"
            fill={active ? "#3b82f6" : "currentColor"}
          />
        ))
      )}
    </svg>
  );
}

// ─── View Mode Switcher ───

function ViewSwitcher({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => onChange("strip")}
        className="p-1 rounded hover:bg-white/10 transition-colors text-white/70 hover:text-white"
        title="Strip view"
      >
        <StripIcon active={mode === "strip"} />
      </button>
      <button
        onClick={() => onChange("speaker")}
        className="p-1 rounded hover:bg-white/10 transition-colors text-white/70 hover:text-white"
        title="Speaker view"
      >
        <SpeakerIcon active={mode === "speaker"} />
      </button>
      <button
        onClick={() => onChange("gallery")}
        className="p-1 rounded hover:bg-white/10 transition-colors text-white/70 hover:text-white"
        title="Gallery view"
      >
        <GalleryIcon active={mode === "gallery"} />
      </button>
    </div>
  );
}

// ─── Resize Grip Indicators ───
// Visual-only indicators inside the overlay at bottom-left and bottom-right corners.
// pointer-events-none — actual resize is handled by react-rnd's default hit areas.

function ResizeGrips() {
  return (
    <>
      {/* Bottom-left grip */}
      <div className="absolute bottom-1 left-1 z-30 pointer-events-none">
        <svg width="10" height="10" viewBox="0 0 10 10" className="text-white/40">
          <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="1" y1="5" x2="5" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      {/* Bottom-right grip */}
      <div className="absolute bottom-1 right-1 z-30 pointer-events-none">
        <svg width="10" height="10" viewBox="0 0 10 10" className="text-white/40">
          <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="9" y1="5" x2="5" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </>
  );
}

// ─── Document Detection Overlay ───

function DocumentOverlay({ detection }: { detection: DetectionResult | null }) {
  if (!detection?.detected || !detection.corners) return null;

  const [tl, tr, br, bl] = detection.corners;
  const bs = 20;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <div className="absolute inset-0 border-2 border-green-400/60 rounded-lg animate-pulse" />
      <svg className="absolute inset-0 w-full h-full">
        <line x1={`${tl.x*100}%`} y1={`${tl.y*100}%`} x2={`${tl.x*100+bs}%`} y2={`${tl.y*100}%`} stroke="#4ade80" strokeWidth="3" strokeLinecap="round" />
        <line x1={`${tl.x*100}%`} y1={`${tl.y*100}%`} x2={`${tl.x*100}%`} y2={`${tl.y*100+bs}%`} stroke="#4ade80" strokeWidth="3" strokeLinecap="round" />
        <line x1={`${tr.x*100}%`} y1={`${tr.y*100}%`} x2={`${tr.x*100-bs}%`} y2={`${tr.y*100}%`} stroke="#4ade80" strokeWidth="3" strokeLinecap="round" />
        <line x1={`${tr.x*100}%`} y1={`${tr.y*100}%`} x2={`${tr.x*100}%`} y2={`${tr.y*100+bs}%`} stroke="#4ade80" strokeWidth="3" strokeLinecap="round" />
        <line x1={`${br.x*100}%`} y1={`${br.y*100}%`} x2={`${br.x*100-bs}%`} y2={`${br.y*100}%`} stroke="#4ade80" strokeWidth="3" strokeLinecap="round" />
        <line x1={`${br.x*100}%`} y1={`${br.y*100}%`} x2={`${br.x*100}%`} y2={`${br.y*100-bs}%`} stroke="#4ade80" strokeWidth="3" strokeLinecap="round" />
        <line x1={`${bl.x*100}%`} y1={`${bl.y*100}%`} x2={`${bl.x*100+bs}%`} y2={`${bl.y*100}%`} stroke="#4ade80" strokeWidth="3" strokeLinecap="round" />
        <line x1={`${bl.x*100}%`} y1={`${bl.y*100}%`} x2={`${bl.x*100}%`} y2={`${bl.y*100-bs}%`} stroke="#4ade80" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-green-500/80 backdrop-blur-sm text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full">
        Paper detected
      </div>
    </div>
  );
}

// ─── Scan Flash ───

function ScanFlash({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      className="absolute inset-0 z-20 bg-white/80 rounded-lg pointer-events-none"
      style={{ animation: "flash 200ms ease-out forwards" }}
    />
  );
}

// ─── Canvas Video Mirror ───
// Draws a <video> onto a <canvas> at native resolution (devicePixelRatio-aware)

function createVideoMirror(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  mirror = false,
): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  let animId: number;
  const draw = () => {
    if (video.videoWidth) {
      const dpr = window.devicePixelRatio || 1;
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
        canvas.width = cw * dpr;
        canvas.height = ch * dpr;
      }
      // "object-fit: cover" — crop source to fill canvas without distortion
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const canvasRatio = canvas.width / canvas.height;
      const videoRatio = vw / vh;
      let sx = 0, sy = 0, sw = vw, sh = vh;
      if (videoRatio > canvasRatio) {
        // Video is wider — crop sides
        sw = vh * canvasRatio;
        sx = (vw - sw) / 2;
      } else {
        // Video is taller — crop top/bottom
        sh = vw / canvasRatio;
        sy = (vh - sh) / 2;
      }
      if (mirror) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, sx, sy, sw, sh, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();
      } else {
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      }
    }
    animId = requestAnimationFrame(draw);
  };
  animId = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(animId);
}

// ─── Main Component ───

export function FloatingVideoOverlay({
  avatarStatus,
  onAttachAvatar,
  userCamera,
  onScan,
  isThinking = false,
  collapsed = false,
  onCollapsedChange,
}: FloatingVideoOverlayProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("speaker");
  const [minimized, setMinimized] = useState(false);
  const avatarVideoRef = useRef<HTMLVideoElement>(null);
  const attachedRef = useRef(false);
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [scanFlash, setScanFlash] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const rndRef = useRef<Rnd>(null);

  // Sync collapsed prop with minimized state
  useEffect(() => {
    setMinimized(collapsed);
  }, [collapsed]);

  // Notify parent when minimized changes
  const handleMinimizedChange = useCallback((newMinimized: boolean) => {
    setMinimized(newMinimized);
    onCollapsedChange?.(newMinimized);
  }, [onCollapsedChange]);

  // Pulse when thinking OR when avatar is speaking (includes greeting)
  const shouldPulse = isThinking || avatarStatus === "speaking";

  // Delayed fade-out: stays active 800ms after conditions go false
  useEffect(() => {
    if (shouldPulse) {
      setShowPulse(true);
    } else {
      const timer = setTimeout(() => setShowPulse(false), 800);
      return () => clearTimeout(timer);
    }
  }, [shouldPulse]);

  const avatarActive = avatarStatus !== "disconnected";

  // Attach avatar video element once (element never unmounts)
  useEffect(() => {
    if (avatarVideoRef.current && !attachedRef.current && avatarStatus !== "disconnected") {
      onAttachAvatar(avatarVideoRef.current);
      attachedRef.current = true;
    }
    if (avatarStatus === "disconnected") {
      attachedRef.current = false;
    }
  }, [avatarStatus, onAttachAvatar]);

  // Attach user camera stream
  useEffect(() => {
    if (userCamera.videoRef.current && userCamera.stream) {
      userCamera.videoRef.current.srcObject = userCamera.stream;
    }
  }, [userCamera.stream, userCamera.videoRef]);

  // Resize the Rnd when viewMode changes
  useEffect(() => {
    if (rndRef.current && !minimized) {
      const dim = DIMENSIONS[viewMode];
      rndRef.current.updateSize({ width: dim.width, height: dim.height });
    }
  }, [viewMode, minimized]);

  // Document detection loop (only in gallery mode with active camera)
  useEffect(() => {
    if (!userCamera.isActive || viewMode !== "gallery") {
      setDetection(null);
      return;
    }

    let frameCount = 0;
    let animId: number;

    const loop = () => {
      frameCount++;
      if (frameCount % 3 === 0 && userCamera.videoRef.current) {
        const result = detectDocument(userCamera.videoRef.current);
        setDetection(result);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [userCamera.isActive, userCamera.videoRef, viewMode]);

  // Handle scan
  const handleScan = useCallback(() => {
    if (!userCamera.videoRef.current) return;
    const result = captureFrame(userCamera.videoRef.current);
    if (!result) return;

    setScanFlash(true);
    setTimeout(() => setScanFlash(false), 200);
    onScan?.(result);
  }, [userCamera.videoRef, onScan]);

  // Don't render if avatar is disconnected and camera is off
  if (!avatarActive && !userCamera.isActive) return null;

  const dim = DIMENSIONS[viewMode];
  const minSize = MIN_SIZES[viewMode];

  // Show avatar video in: speaker (full), gallery (top half)
  // Show camera video in: speaker (when no avatar), gallery (bottom half)
  const showAvatarVideo = avatarActive && !minimized;
  const showCameraVideo = !minimized && (viewMode === "gallery" || (viewMode === "speaker" && !avatarActive && userCamera.isActive));

  // Whether resizing is allowed (not in strip mode)
  const canResize = viewMode !== "strip" && !minimized;

  // Single return — videos always at same tree position, never unmount
  return (
    <>
      {/* ─── Always-mounted video elements (MUST stay at this tree position) ─── */}
      <video
        ref={avatarVideoRef}
        autoPlay
        playsInline
        className="sr-only"
        aria-hidden
      />
      <video
        ref={userCamera.videoRef}
        autoPlay
        playsInline
        muted
        className="sr-only"
        aria-hidden
      />

{/* ─── Minimized pill ─── */}
      {minimized && (
        <div className="fixed top-3 right-3 z-50">
          <button
            onClick={() => handleMinimizedChange(false)}
            className="flex items-center gap-2 bg-black/80 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-full shadow-lg hover:bg-black/90 transition-colors border border-white/10"
          >
            <span className={`w-2 h-2 rounded-full ${avatarActive ? statusColors[avatarStatus] : "bg-gray-500"}`} />
            {avatarActive ? statusLabels[avatarStatus] : "Camera"}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </div>
      )}

      {/* ─── Main overlay (hidden when minimized) ─── */}
      {!minimized && (
        <Rnd
          ref={rndRef}
          default={{
            x: typeof window !== "undefined" ? window.innerWidth - dim.width - 16 : 600,
            y: 12,
            width: dim.width,
            height: dim.height,
          }}
          minWidth={minSize.width}
          minHeight={minSize.height}
          maxWidth={600}
          maxHeight={600}
          enableResizing={canResize ? {
            bottomLeft: true,
            bottomRight: true,
            top: false,
            right: false,
            bottom: false,
            left: false,
            topLeft: false,
            topRight: false,
          } : false}
          resizeHandleStyles={canResize ? {
            bottomLeft: { width: 20, height: 20, bottom: 0, left: 0, cursor: "sw-resize" },
            bottomRight: { width: 20, height: 20, bottom: 0, right: 0, cursor: "se-resize" },
          } : undefined}
          lockAspectRatio={viewMode === "speaker"}
          bounds="window"
          dragHandleClassName="overlay-drag-handle"
          className="z-50"
        >
          <div className={`w-full h-full rounded-xl overflow-hidden shadow-2xl bg-zinc-900 group relative transition-all duration-700 ${
            showPulse
              ? "border-2 border-blue-400/60 thinking-pulse"
              : "border border-white/10"
          }`}>

            {/* Resize grip indicators (inside, bottom corners) */}
            {canResize && <ResizeGrips />}

            {/* ─── Strip Mode ─── */}
            {viewMode === "strip" && (
              <div className="overlay-drag-handle w-full h-full flex items-center px-3 gap-3 cursor-grab active:cursor-grabbing bg-zinc-900">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <ViewSwitcher mode={viewMode} onChange={setViewMode} />
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {avatarActive && (
                    <>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${statusColors[avatarStatus]}`} />
                      <span className="text-white/80 text-sm font-medium truncate">
                        {avatarStatus === "speaking" ? "Talking: Minerva" :
                         avatarStatus === "listening" ? "Listening..." :
                         statusLabels[avatarStatus]}
                      </span>
                    </>
                  )}
                </div>
<button
                    onClick={(e) => { e.stopPropagation(); handleMinimizedChange(true); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-white/50 hover:text-white p-1"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
              </div>
            )}

            {/* ─── Speaker Mode ─── */}
            {viewMode === "speaker" && (
              <div className="relative w-full h-full">
                {/* Placeholder when no video */}
                {!showAvatarVideo && !showCameraVideo && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-white/30 text-lg font-semibold">M</div>
                  </div>
                )}

                {/* Hover controls — top bar */}
                <div className="overlay-drag-handle absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-between px-2 cursor-grab active:cursor-grabbing z-20">
                  <ViewSwitcher mode={viewMode} onChange={setViewMode} />
<button
                    onClick={(e) => { e.stopPropagation(); handleMinimizedChange(true); }}
                    className="text-white/60 hover:text-white p-1 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>

                {/* Name label — bottom left */}
                <div className="absolute bottom-1.5 left-1.5 z-10 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5">
                  <span className="text-white/90 text-[11px] font-medium">
                    {avatarActive ? "Minerva" : "You"}
                  </span>
                </div>

                {/* Mirrored video for speaker mode */}
                {showAvatarVideo && (
                  <canvas
                    ref={(canvas) => {
                      if (!canvas || !avatarVideoRef.current) return;
                      return createVideoMirror(canvas, avatarVideoRef.current);
                    }}
                    className="absolute inset-0 w-full h-full object-cover rounded-xl z-0"
                  />
                )}
                {showCameraVideo && !showAvatarVideo && (
                  <canvas
                    ref={(canvas) => {
                      if (!canvas || !userCamera.videoRef.current) return;
                      return createVideoMirror(canvas, userCamera.videoRef.current, true);
                    }}
                    className="absolute inset-0 w-full h-full object-cover rounded-xl z-0"
                  />
                )}
              </div>
            )}

            {/* ─── Gallery Mode ─── */}
            {viewMode === "gallery" && (
              <div className="relative w-full h-full flex flex-col">
                {/* Hover controls — top */}
                <div className="overlay-drag-handle absolute inset-x-0 top-0 z-20 h-8 bg-gradient-to-b from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-between px-2 cursor-grab active:cursor-grabbing">
                  <ViewSwitcher mode={viewMode} onChange={setViewMode} />
<button
                    onClick={(e) => { e.stopPropagation(); handleMinimizedChange(true); }}
                    className="text-white/60 hover:text-white p-1 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>

                {/* Avatar tile — top half */}
                <div className="relative flex-1 min-h-0 overflow-hidden">
                  {avatarActive ? (
                    <canvas
                      ref={(canvas) => {
                        if (!canvas || !avatarVideoRef.current) return;
                        return createVideoMirror(canvas, avatarVideoRef.current);
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                      <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-white/30 text-sm font-semibold">M</div>
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1.5 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5">
                    {avatarActive && <span className={`w-1.5 h-1.5 rounded-full ${statusColors[avatarStatus]}`} />}
                    <span className="text-white/90 text-[10px] font-medium">Minerva</span>
                  </div>
                </div>

                {/* 1px divider */}
                <div className="h-px bg-white/10 shrink-0" />

                {/* Camera tile — bottom half */}
                <div className="relative flex-1 min-h-0 overflow-hidden">
                  <ScanFlash active={scanFlash} />
                  <DocumentOverlay detection={detection} />
                  {userCamera.isActive ? (
                    <canvas
                      ref={(canvas) => {
                        if (!canvas || !userCamera.videoRef.current) return;
                        return createVideoMirror(canvas, userCamera.videoRef.current, true);
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                      <button
                        onClick={userCamera.startCamera}
                        className="flex flex-col items-center gap-1 text-white/40 hover:text-white/60 transition-colors"
                      >
                        <Camera size={20} />
                        <span className="text-[10px]">Start Camera</span>
                      </button>
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1.5 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${userCamera.isActive ? "bg-green-500" : "bg-gray-500"}`} />
                    <span className="text-white/90 text-[10px] font-medium">You</span>
                  </div>
                  {userCamera.isActive && (
                    <button
                      onClick={handleScan}
                      className="absolute bottom-1 right-1.5 z-10 flex items-center gap-1 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-[10px] font-medium px-1.5 py-1 rounded transition-colors"
                    >
                      <ScanLine size={12} />
                      Scan
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </Rnd>
      )}

      <style>{`
        @keyframes flash { 0% { opacity: 0.8; } 100% { opacity: 0; } }
        @keyframes thinking-glow {
          0%, 100% { box-shadow: 0 0 8px 2px rgba(96, 165, 250, 0.3); }
          50% { box-shadow: 0 0 20px 6px rgba(96, 165, 250, 0.5); }
        }
        .thinking-pulse { animation: thinking-glow 2s ease-in-out infinite; }
      `}</style>
    </>
  );
}
