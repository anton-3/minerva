// MinervaBoard — Scrollable AI whiteboard with zoom
// A scrollable surface where Minerva writes equations, draws diagrams, and annotates.
// Native CSS scroll for vertical movement. CSS zoom for scaling.
// GSAP for writing animations + KaTeX for math + SVG annotation overlay.
// Phase 1 of Unified Board: native scroll enables inline iframes/videos/Desmos later.

"use client";

import { useRef, useEffect, useLayoutEffect, useCallback, useState, useMemo } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { TextPlugin } from "gsap/TextPlugin";
import katex from "katex";
import "katex/dist/katex.min.css";
import type { ContentStep } from "@/types/session";
import { useSessionStore } from "@/stores/sessionStore";
import { buildSandboxSrcdoc } from "@/lib/sandbox/template";

gsap.registerPlugin(useGSAP, TextPlugin);

// ─── Constants ──────────────────────────────────────────────────────────────

const ZOOM_STEP = 0.1;

// ─── Annotation data ────────────────────────────────────────────────────────

interface AnnotationData {
  type: "circle" | "underline" | "arrow" | "box" | "crossOut";
  target?: number;
  from?: number;
  to?: number;
  color?: string;
  label?: string;
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface StepsPanelProps {
  steps: ContentStep[];
}

export function StepsPanel({ steps }: StepsPanelProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const elementRefs = useRef<Map<number, HTMLElement>>(new Map());
  const animatedCountRef = useRef(0);

  // Zoom state from store (shared with BottomControlBar)
  const zoom = useSessionStore((s) => s.zoom);
  const setZoom = useSessionStore((s) => s.setZoom);
  const prevZoomRef = useRef(1);

  // Auto-follow: pauses when student scrolls up to review
  const isAutoFollowing = useRef(true);
  const [showBackToLive, setShowBackToLive] = useState(false);

  // Force re-render after DOM commit so annotation getRect() finds newly registered refs.
  // Callback refs fire during commit (before useLayoutEffect), so by the time
  // useLayoutEffect runs, all element refs are populated. The state update triggers
  // a synchronous re-render before paint — user sees content + annotations together.
  const [, setRefTick] = useState(0);
  useLayoutEffect(() => {
    setRefTick((t) => t + 1);
  }, [steps.length]);
  const lastScrollTop = useRef(0);

  // Derive content and annotations from steps (no state, no loops)
  const contentSteps = useMemo(
    () =>
      steps.filter(
        (s) =>
          s.type === "step" ||
          s.type === "numberLine" ||
          s.type === "diagram" ||
          s.type === "divider" ||
          s.type === "graph" ||
          s.type === "sandbox" ||
          s.type === "video" ||
          s.type === "image" ||
          s.type === "code"
      ),
    [steps]
  );

  // Derive sections from dividers for navigation
  const sections = useMemo(() => {
    const result: { label: string; contentIndex: number }[] = [];
    let idx = 0;
    let hasIntro = false;
    for (const s of steps) {
      if (s.type === "step" || s.type === "numberLine" || s.type === "diagram" || s.type === "divider") {
        if (s.type === "divider" && s.label) {
          result.push({ label: s.label, contentIndex: idx });
        } else if (!hasIntro && s.type === "step" && s.label) {
          result.push({ label: s.label, contentIndex: idx });
          hasIntro = true;
        }
        idx++;
      }
    }
    return result;
  }, [steps]);

  const annotations = useMemo<AnnotationData[]>(() => {
    const result: AnnotationData[] = [];
    for (const s of steps) {
      if (s.type === "circle")
        result.push({ type: "circle", target: s.target, color: s.color });
      else if (s.type === "underline")
        result.push({ type: "underline", target: s.target, color: s.color });
      else if (s.type === "arrow")
        result.push({
          type: "arrow",
          from: s.from,
          to: s.to,
          label: s.label,
        });
      else if (s.type === "box")
        result.push({ type: "box", target: s.target, color: s.color });
      else if (s.type === "crossOut")
        result.push({ type: "crossOut", target: s.target });
      else if (s.type === "highlight")
        result.push({
          type: "box",
          target: s.stepIndex,
          color: s.color || "#fef08a",
        });
    }
    return result;
  }, [steps]);

  // Register element ref by content index
  const registerRef = useCallback((index: number, el: HTMLElement | null) => {
    if (el) elementRefs.current.set(index, el);
    else elementRefs.current.delete(index);
  }, []);

  // GSAP context
  const { contextSafe } = useGSAP({ scope: boardRef });

  // Animate new content — uses ref to avoid dependency issues
  const animateRef = useRef<() => void>(() => {});
  animateRef.current = () => {
    if (!canvasRef.current) return;
    const elements =
      canvasRef.current.querySelectorAll<HTMLElement>(".board-element");
    const newElements = Array.from(elements).slice(animatedCountRef.current);
    if (newElements.length === 0) return;

    // Stagger delay per element so steps appear sequentially
    const STAGGER_DELAY = 0.4; // seconds between each step appearing

    newElements.forEach((el, elIdx) => {
      const baseDelay = elIdx * STAGGER_DELAY;

      gsap.fromTo(
        el,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.35, ease: "power2.out", delay: baseDelay }
      );

      // Writing animation for KaTeX math
      const katexEl = el.querySelector(".katex-html");
      if (katexEl) {
        const spans = katexEl.querySelectorAll(
          ".mord, .mbin, .mrel, .mopen, .mclose, .mpunct, .minner, .mop"
        );
        if (spans.length > 0) {
          gsap.set(spans, { opacity: 0 });
          gsap.to(spans, {
            opacity: 1,
            duration: 0.06,
            stagger: 0.035,
            ease: "power1.out",
            delay: baseDelay + 0.2,
          });
        }
      }

      // Typewriter for text
      const textEl = el.querySelector<HTMLElement>(".board-text");
      if (textEl) {
        const fullText = textEl.dataset.text || "";
        if (fullText) {
          textEl.textContent = "";
          gsap.to(textEl, {
            duration: fullText.length * 0.03,
            text: { value: fullText },
            ease: "none",
            delay: baseDelay + 0.15,
          });
        }
      }

      // Typewriter for labels
      const labelEl = el.querySelector<HTMLElement>(".board-label");
      if (labelEl) {
        const fullText = labelEl.dataset.text || "";
        if (fullText) {
          labelEl.textContent = "";
          gsap.to(labelEl, {
            duration: fullText.length * 0.025,
            text: { value: fullText },
            ease: "none",
            delay: baseDelay,
          });
        }
      }

      // Auto-scroll to each element as it appears
      if (isAutoFollowing.current && scrollRef.current) {
        setTimeout(() => {
          if (!isAutoFollowing.current || !scrollRef.current) return;
          el.scrollIntoView({ behavior: "smooth", block: "end" });
        }, baseDelay * 1000 + 200);
      }
    });

    animatedCountRef.current = elements.length;
  };

  const safeAnimate = contextSafe(() => animateRef.current());

  // Trigger animation when content changes
  useEffect(() => {
    if (contentSteps.length === 0) {
      animatedCountRef.current = 0;
      return;
    }
    // If step count decreased (board was cleared + new steps added),
    // reset the animation counter so new elements get animated
    if (contentSteps.length < animatedCountRef.current) {
      animatedCountRef.current = 0;
    }
    const id = requestAnimationFrame(() => safeAnimate());
    return () => cancelAnimationFrame(id);
  }, [contentSteps.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset when steps cleared
  useEffect(() => {
    if (steps.length === 0) {
      animatedCountRef.current = 0;
      useSessionStore.getState().resetZoom();
      prevZoomRef.current = 1;
      isAutoFollowing.current = true;
      setShowBackToLive(false);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }
  }, [steps.length]);

  // ─── Wheel zoom (non-passive listener for preventDefault) ──────────────

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd + scroll = zoom (also macOS pinch-to-zoom sends ctrlKey)
        e.preventDefault();
        const currentZoom = useSessionStore.getState().zoom;
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        setZoom(currentZoom + delta);
      }
      // Regular scroll → handled natively by overflow-y: auto
    };

    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // Adjust scroll position when zoom changes to keep content in place
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || prevZoomRef.current === zoom) return;

    const ratio = zoom / prevZoomRef.current;
    el.scrollTop = el.scrollTop * ratio;
    prevZoomRef.current = zoom;
  }, [zoom]);

  // ─── Scroll handler — detect scroll direction for auto-follow ──────────

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Scrolled up? Pause auto-follow
    if (el.scrollTop < lastScrollTop.current - 20) {
      isAutoFollowing.current = false;
      setShowBackToLive(true);
    }

    // Near bottom? Resume auto-follow
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    if (atBottom) {
      isAutoFollowing.current = true;
      setShowBackToLive(false);
    }

    lastScrollTop.current = el.scrollTop;
  }, []);

  // ─── Draggable section nav ─────────────────────────────────────────────
  // Default position: right side, vertically centered (under avatar window)
  const [navPos, setNavPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const pos = navPos ?? getDefaultNavPos();
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current || !boardRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      const bounds = boardRef.current.getBoundingClientRect();
      const nx = Math.max(0, Math.min(bounds.width - 120, dragRef.current.originX + dx));
      const ny = Math.max(0, Math.min(bounds.height - 60, dragRef.current.originY + dy));
      setNavPos({ x: nx, y: ny });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [navPos]);

  function getDefaultNavPos() {
    if (!boardRef.current) return { x: 0, y: 0 };
    const bounds = boardRef.current.getBoundingClientRect();
    return { x: bounds.width - 170, y: bounds.height / 2 - 40 };
  }

  // Return to live: resume auto-follow and scroll to latest content
  const returnToLive = useCallback(() => {
    isAutoFollowing.current = true;
    setShowBackToLive(false);

    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  // ─── Empty state ──────────────────────────────────────────────────────

  if (steps.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#faf9f6]"
        style={{
          backgroundImage: "radial-gradient(circle, #d4d4d4 0.8px, transparent 0.8px)",
          backgroundSize: "24px 24px",
        }}
      >
        <p className="font-handwriting text-neutral-400 text-lg">
          Minerva&apos;s whiteboard...
        </p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────

  let contentIndex = 0;

  return (
    <div
      ref={boardRef}
      className="w-full h-full relative overflow-hidden bg-[#faf9f6]"
      style={{
        backgroundImage: "radial-gradient(circle, #d4d4d4 0.8px, transparent 0.8px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Scrollable container — native CSS scroll */}
      <div
        ref={scrollRef}
        className="w-full h-full overflow-y-auto overflow-x-auto"
        onScroll={handleScroll}
      >
        {/* Zoom container — CSS zoom affects layout, scrollbar works correctly */}
        <div
          ref={canvasRef}
          className="relative"
          style={{
            zoom,
            padding: "40px",
            minHeight: "100%",
          }}
        >
          {/* Content elements — width capped at ~2/3 viewport so avatar overlay has room */}
          <div className="space-y-5 max-w-[66vw]">
            {steps.map((step, i) => {
              // Skip annotations and clear commands — they're handled separately
              if (
                step.type === "circle" ||
                step.type === "underline" ||
                step.type === "arrow" ||
                step.type === "box" ||
                step.type === "crossOut" ||
                step.type === "highlight" ||
                step.type === "clear"
              ) {
                return null;
              }

              const idx = contentIndex++;
              return (
                <ContentElement
                  key={`${idx}-${i}`}
                  step={step}
                  index={idx}
                  registerRef={registerRef}
                />
              );
            })}
          </div>

          {/* SVG annotation overlay — inside zoom container so it scales with content */}
          <AnnotationOverlay
            annotations={annotations}
            elementRefs={elementRefs}
            canvasRef={canvasRef}
            zoom={zoom}
          />
        </div>
      </div>

      {/* Section navigation — draggable, defaults to right-center (under avatar) */}
      {sections.length > 1 && (
        <div
          className="absolute z-20 flex flex-col gap-0.5 max-h-[40%] overflow-y-auto bg-white/80 backdrop-blur-sm rounded-lg border border-border-light shadow-sm p-1.5"
          style={navPos
            ? { left: navPos.x, top: navPos.y }
            : { right: 16, top: "calc(50% - 40px)" }
          }
        >
          {/* Drag handle */}
          <div
            className="flex justify-center py-0.5 cursor-grab active:cursor-grabbing select-none"
            onMouseDown={onDragStart}
          >
            <svg width="16" height="8" viewBox="0 0 16 8" className="text-neutral-400">
              <circle cx="4" cy="2" r="1.2" fill="currentColor" />
              <circle cx="8" cy="2" r="1.2" fill="currentColor" />
              <circle cx="12" cy="2" r="1.2" fill="currentColor" />
              <circle cx="4" cy="6" r="1.2" fill="currentColor" />
              <circle cx="8" cy="6" r="1.2" fill="currentColor" />
              <circle cx="12" cy="6" r="1.2" fill="currentColor" />
            </svg>
          </div>
          {sections.map((section, i) => (
            <button
              key={`${section.contentIndex}-${i}`}
              onClick={() => {
                const el = elementRefs.current.get(section.contentIndex);
                if (!el) return;
                isAutoFollowing.current = false;
                setShowBackToLive(true);
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="text-left text-xs px-2 py-1 rounded transition-colors font-handwriting text-text-secondary hover:bg-brand-primary/10 hover:text-brand-primary truncate max-w-40"
            >
              {section.label}
            </button>
          ))}
        </div>
      )}

      {/* "Back to latest" pill — shown when auto-follow is paused, positioned above control bar */}
      {showBackToLive && (
        <button
          onClick={returnToLive}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 bg-brand-primary text-white rounded-full text-xs font-medium shadow-md hover:bg-brand-primary/90 transition-all"
        >
          ↓ Back to latest
        </button>
      )}
    </div>
  );
}

// ─── Content Element Renderer ───────────────────────────────────────────────

function ContentElement({
  step,
  index,
  registerRef,
}: {
  step: ContentStep;
  index: number;
  registerRef: (index: number, el: HTMLElement | null) => void;
}) {
  if (step.type === "step")
    return <MathStep step={step} index={index} registerRef={registerRef} />;
  if (step.type === "numberLine")
    return (
      <NumberLineStep step={step} index={index} registerRef={registerRef} />
    );
  if (step.type === "diagram")
    return <DiagramStep step={step} index={index} registerRef={registerRef} />;
  if (step.type === "divider")
    return <DividerStep step={step} index={index} registerRef={registerRef} />;
  if (step.type === "graph")
    return <InlineGraph step={step} index={index} registerRef={registerRef} />;
  if (step.type === "sandbox")
    return <InlineSandbox step={step} index={index} registerRef={registerRef} />;
  if (step.type === "video")
    return <InlineVideo step={step} index={index} registerRef={registerRef} />;
  if (step.type === "image")
    return <InlineImage step={step} index={index} registerRef={registerRef} />;
  if (step.type === "code")
    return <InlineCode step={step} index={index} registerRef={registerRef} />;
  return null;
}

// ─── Math Step ──────────────────────────────────────────────────────────────

function MathStep({
  step,
  index,
  registerRef,
}: {
  step: Extract<ContentStep, { type: "step" }>;
  index: number;
  registerRef: (index: number, el: HTMLElement | null) => void;
}) {
  const mathRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step.math && mathRef.current) {
      try {
        katex.render(step.math, mathRef.current, {
          throwOnError: false,
          displayMode: true,
        });
      } catch {
        if (mathRef.current) mathRef.current.textContent = step.math;
      }
    }
  }, [step.math]);

  const isAnswer =
    step.label?.toLowerCase().includes("answer") ||
    step.label?.toLowerCase().includes("solution");

  return (
    <div
      ref={(el) => registerRef(index, el)}
      className="board-element"
      style={{ opacity: 0 }}
      data-index={index}
    >
      {step.label && (
        <div
          className={`board-label font-handwriting text-sm font-bold tracking-wide mb-1 ${
            isAnswer ? "text-green-600" : "text-brand-primary"
          }`}
          data-text={step.label}
        >
          {step.label}
        </div>
      )}
      {step.math && (
        <div
          ref={mathRef}
          className="text-neutral-dark text-xl overflow-x-auto"
        />
      )}
      {step.text && (
        <p
          className="board-text font-handwriting text-text-secondary text-base mt-1.5 leading-relaxed"
          data-text={step.text}
        >
          {step.text}
        </p>
      )}
    </div>
  );
}

// ─── Number Line ────────────────────────────────────────────────────────────

function NumberLineStep({
  step,
  index,
  registerRef,
}: {
  step: Extract<ContentStep, { type: "numberLine" }>;
  index: number;
  registerRef: (index: number, el: HTMLElement | null) => void;
}) {
  const { min, max, highlights = [] } = step;
  const range = max - min;
  const padding = 40;
  const width = 500;
  const height = 80;
  const lineY = 50;
  const lineStart = padding;
  const lineEnd = width - padding;
  const toX = (val: number) =>
    lineStart + ((val - min) / range) * (lineEnd - lineStart);

  const ticks: number[] = [];
  const sz = range <= 10 ? 1 : range <= 20 ? 2 : Math.ceil(range / 10);
  for (let v = min; v <= max; v += sz) ticks.push(v);

  return (
    <div
      ref={(el) => registerRef(index, el)}
      className="board-element max-w-lg"
      style={{ opacity: 0 }}
      data-index={index}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: 80 }}>
        <line x1={lineStart} y1={lineY} x2={lineEnd} y2={lineY} stroke="#525252" strokeWidth={2} />
        <polygon points={`${lineStart-6},${lineY} ${lineStart+2},${lineY-4} ${lineStart+2},${lineY+4}`} fill="#525252" />
        <polygon points={`${lineEnd+6},${lineY} ${lineEnd-2},${lineY-4} ${lineEnd-2},${lineY+4}`} fill="#525252" />
        {ticks.map((v) => (
          <g key={v}>
            <line x1={toX(v)} y1={lineY-6} x2={toX(v)} y2={lineY+6} stroke="#525252" strokeWidth={1.5} />
            <text x={toX(v)} y={lineY+22} textAnchor="middle" fill="#525252" fontSize={12} fontFamily="var(--font-handwriting)">{v}</text>
          </g>
        ))}
        {highlights.map((v) => (
          <g key={`h-${v}`}>
            <circle cx={toX(v)} cy={lineY} r={6} fill="#3b82f6" stroke="#60a5fa" strokeWidth={2} />
            <text x={toX(v)} y={lineY-14} textAnchor="middle" fill="#3b82f6" fontSize={13} fontWeight="bold" fontFamily="var(--font-handwriting)">{v}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Diagram ────────────────────────────────────────────────────────────────

function DiagramStep({
  step,
  index,
  registerRef,
}: {
  step: Extract<ContentStep, { type: "diagram" }>;
  index: number;
  registerRef: (index: number, el: HTMLElement | null) => void;
}) {
  return (
    <div
      ref={(el) => registerRef(index, el)}
      className="board-element max-w-lg flex items-center justify-center"
      style={{ opacity: 0 }}
      data-index={index}
      dangerouslySetInnerHTML={{ __html: step.svg }}
    />
  );
}

// ─── Divider ────────────────────────────────────────────────────────────────

function DividerStep({
  step,
  index,
  registerRef,
}: {
  step: Extract<ContentStep, { type: "divider" }>;
  index: number;
  registerRef: (index: number, el: HTMLElement | null) => void;
}) {
  return (
    <div
      ref={(el) => registerRef(index, el)}
      className="board-element flex items-center gap-4 my-2"
      style={{ opacity: 0 }}
      data-index={index}
    >
      <div className="flex-1 h-px bg-neutral-300" />
      {step.label && (
        <span className="font-handwriting text-sm text-neutral-400">{step.label}</span>
      )}
      <div className="flex-1 h-px bg-neutral-300" />
    </div>
  );
}

// ─── Inline Graph (Desmos/GeoGebra) ─────────────────────────────────────────

function InlineGraph({
  step,
  index,
  registerRef,
}: {
  step: Extract<ContentStep, { type: "graph" }>;
  index: number;
  registerRef: (index: number, el: HTMLElement | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const calcRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || calcRef.current) return;

    // Desmos 2D
    if (step.tool === "desmos" && typeof window !== "undefined") {
      const script = document.querySelector('script[src*="desmos"]');
      const tryInit = () => {
        const Desmos = (window as unknown as Record<string, unknown>).Desmos as {
          GraphingCalculator: (el: HTMLElement, opts: Record<string, unknown>) => {
            setExpression: (expr: Record<string, unknown>) => void;
            setMathBounds: (bounds: Record<string, number>) => void;
            destroy: () => void;
          };
        } | undefined;
        if (!Desmos || !containerRef.current) return;
        const calc = Desmos.GraphingCalculator(containerRef.current, {
          expressions: false,
          settingsMenu: false,
          zoomButtons: true,
          border: false,
        });
        if (step.expressions) {
          for (const expr of step.expressions) {
            calc.setExpression({ id: expr.id || String(Math.random()), latex: expr.latex, color: expr.color });
          }
        }
        if (step.viewport) {
          calc.setMathBounds(step.viewport);
        }
        calcRef.current = calc;
      };

      if (script) {
        tryInit();
      } else {
        // Load Desmos API dynamically
        const s = document.createElement("script");
        s.src = "https://www.desmos.com/api/v1.10/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6";
        s.async = true;
        s.onload = tryInit;
        document.head.appendChild(s);
      }
    }

    return () => {
      if (calcRef.current && typeof (calcRef.current as { destroy?: () => void }).destroy === "function") {
        (calcRef.current as { destroy: () => void }).destroy();
        calcRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={(el) => registerRef(index, el)}
      className="board-element rounded-lg border border-border-light overflow-hidden"
      style={{ opacity: 0 }}
      data-index={index}
    >
      <div ref={containerRef} className="w-full" style={{ height: 350 }} />
      <div className="px-3 py-1.5 bg-neutral-50 border-t border-border-light flex items-center justify-between">
        <span className="text-xs text-text-secondary font-handwriting">
          {step.tool === "desmos" ? "Desmos" : step.tool === "desmos3d" ? "Desmos 3D" : "GeoGebra"}
        </span>
      </div>
    </div>
  );
}

// ─── Inline Sandbox (HTML iframe) ───────────────────────────────────────────

function InlineSandbox({
  step,
  index,
  registerRef,
}: {
  step: Extract<ContentStep, { type: "sandbox" }>;
  index: number;
  registerRef: (index: number, el: HTMLElement | null) => void;
}) {
  const height = step.height || 400;

  // Build full HTML using shared template (includes Chart.js, Matter.js, Water.css)
  const srcdoc = buildSandboxSrcdoc(step.html, step.accent);

  return (
    <div
      ref={(el) => registerRef(index, el)}
      className="board-element rounded-lg border border-border-light overflow-hidden"
      style={{ opacity: 0 }}
      data-index={index}
    >
      <iframe
        srcDoc={srcdoc}
        sandbox="allow-scripts allow-same-origin"
        className="w-full border-0"
        style={{ height }}
        title={step.accent ? `${step.accent} visualization` : "Interactive content"}
      />
      {step.accent && (
        <div className="px-3 py-1.5 bg-neutral-50 border-t border-border-light">
          <span className="text-xs text-text-secondary font-handwriting capitalize">{step.accent}</span>
        </div>
      )}
    </div>
  );
}

// ─── Inline Video ───────────────────────────────────────────────────────────

function InlineVideo({
  step,
  index,
  registerRef,
}: {
  step: Extract<ContentStep, { type: "video" }>;
  index: number;
  registerRef: (index: number, el: HTMLElement | null) => void;
}) {
  return (
    <div
      ref={(el) => registerRef(index, el)}
      className="board-element rounded-lg border border-border-light overflow-hidden"
      style={{ opacity: 0 }}
      data-index={index}
    >
      <video
        src={step.url}
        controls
        autoPlay={step.autoPlay !== false}
        className="w-full"
        style={{ maxHeight: 400 }}
      />
    </div>
  );
}

// ─── Inline Image ───────────────────────────────────────────────────────────

function InlineImage({
  step,
  index,
  registerRef,
}: {
  step: Extract<ContentStep, { type: "image" }>;
  index: number;
  registerRef: (index: number, el: HTMLElement | null) => void;
}) {
  return (
    <div
      ref={(el) => registerRef(index, el)}
      className="board-element"
      style={{ opacity: 0 }}
      data-index={index}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={step.src}
        alt={step.alt || ""}
        className="rounded-lg border border-border-light"
        style={{ maxWidth: step.width || "100%", maxHeight: 500 }}
      />
    </div>
  );
}

// ─── Inline Code ────────────────────────────────────────────────────────────

function InlineCode({
  step,
  index,
  registerRef,
}: {
  step: Extract<ContentStep, { type: "code" }>;
  index: number;
  registerRef: (index: number, el: HTMLElement | null) => void;
}) {
  return (
    <div
      ref={(el) => registerRef(index, el)}
      className="board-element rounded-lg border border-border-light overflow-hidden"
      style={{ opacity: 0 }}
      data-index={index}
    >
      <div className="px-3 py-1.5 bg-neutral-800 border-b border-neutral-700">
        <span className="text-xs text-neutral-400 font-mono">{step.language}</span>
      </div>
      <pre className="p-4 bg-neutral-900 overflow-x-auto">
        <code className="text-sm text-neutral-200 font-mono whitespace-pre">{step.code}</code>
      </pre>
    </div>
  );
}

// ─── SVG Annotation Overlay ─────────────────────────────────────────────────

function AnnotationOverlay({
  annotations,
  elementRefs,
  canvasRef,
  zoom,
}: {
  annotations: AnnotationData[];
  elementRefs: React.MutableRefObject<Map<number, HTMLElement>>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Animate annotation paths on arrival
  useEffect(() => {
    if (!svgRef.current || annotations.length === 0) return;

    // Delay annotation draw-on until after content slide-in animation (350ms GSAP)
    const timer = setTimeout(() => {
      if (!svgRef.current) return;
      const paths = svgRef.current.querySelectorAll<SVGElement>(".annotation-path");

      paths.forEach((path) => {
        if (path instanceof SVGPathElement) {
          const length = path.getTotalLength();
          gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
          gsap.to(path, { strokeDashoffset: 0, duration: 0.6, ease: "power2.inOut" });
        } else if (path instanceof SVGLineElement) {
          const length = Math.sqrt(
            Math.pow(Number(path.getAttribute("x2") || 0) - Number(path.getAttribute("x1") || 0), 2) +
            Math.pow(Number(path.getAttribute("y2") || 0) - Number(path.getAttribute("y1") || 0), 2)
          );
          gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
          gsap.to(path, { strokeDashoffset: 0, duration: 0.6, ease: "power2.inOut" });
        } else if (path instanceof SVGEllipseElement) {
          const rx = Number(path.getAttribute("rx") || 0);
          const ry = Number(path.getAttribute("ry") || 0);
          const circ = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
          gsap.set(path, { strokeDasharray: circ, strokeDashoffset: circ });
          gsap.to(path, { strokeDashoffset: 0, duration: 0.5, ease: "power2.inOut" });
        } else if (path instanceof SVGRectElement) {
          const perimeter = 2 * (Number(path.getAttribute("width") || 0) + Number(path.getAttribute("height") || 0));
          gsap.set(path, { strokeDasharray: perimeter, strokeDashoffset: perimeter });
          gsap.to(path, { strokeDashoffset: 0, duration: 0.5, ease: "power2.inOut" });
        }
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [annotations.length]);

  // Get element rect relative to canvas
  // With CSS zoom: getBoundingClientRect returns zoomed (visual) pixels.
  // SVG coordinate system is in local (unzoomed) space. Divide by zoom.
  const getRect = useCallback(
    (index: number) => {
      const el = elementRefs.current.get(index);
      const canvas = canvasRef.current;
      if (!el || !canvas) return null;

      const elR = el.getBoundingClientRect();
      const canR = canvas.getBoundingClientRect();

      const x = (elR.left - canR.left) / zoom;
      const y = (elR.top - canR.top) / zoom;
      const w = elR.width / zoom;
      const h = elR.height / zoom;

      return { x, y, width: w, height: h, cx: x + w / 2, cy: y + h / 2 };
    },
    [elementRefs, canvasRef, zoom]
  );

  const wobble = () => (Math.random() - 0.5) * 3;

  if (annotations.length === 0) return null;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none"
      style={{ overflow: "visible", width: "100%", height: "100%" }}
    >
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#525252" />
        </marker>
      </defs>

      {annotations.map((ann, i) => {
        if (ann.type === "circle" && ann.target != null) {
          const r = getRect(ann.target);
          if (!r) return null;
          const pad = 8;
          return (
            <ellipse key={`a-${i}`} className="annotation-path"
              cx={r.cx + wobble()} cy={r.cy + wobble()}
              rx={r.width / 2 + pad + wobble()} ry={r.height / 2 + pad + wobble()}
              fill="none" stroke={ann.color || "#ef4444"} strokeWidth={2.5} strokeLinecap="round"
            />
          );
        }

        if (ann.type === "underline" && ann.target != null) {
          const r = getRect(ann.target);
          if (!r) return null;
          const y = r.y + r.height + 3;
          return (
            <line key={`a-${i}`} className="annotation-path"
              x1={r.x + wobble()} y1={y + wobble()}
              x2={r.x + r.width + wobble()} y2={y + wobble()}
              stroke={ann.color || "#3b82f6"} strokeWidth={2.5} strokeLinecap="round"
            />
          );
        }

        if (ann.type === "arrow" && ann.from != null && ann.to != null) {
          const fr = getRect(ann.from);
          const tr = getRect(ann.to);
          if (!fr || !tr) return null;
          const x1 = fr.x + fr.width + 12;
          const y1 = fr.cy;
          const x2 = tr.x - 12;
          const y2 = tr.cy;
          const mx = (x1 + x2) / 2 + 20;
          const my = (y1 + y2) / 2;
          return (
            <g key={`a-${i}`}>
              <path className="annotation-path"
                d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                fill="none" stroke={ann.color || "#525252"} strokeWidth={2} strokeLinecap="round"
                markerEnd="url(#arrowhead)"
              />
              {ann.label && (
                <text x={mx} y={my - 8} textAnchor="middle" fill={ann.color || "#525252"}
                  fontSize={13} fontFamily="var(--font-handwriting)"
                >{ann.label}</text>
              )}
            </g>
          );
        }

        if (ann.type === "box" && ann.target != null) {
          const r = getRect(ann.target);
          if (!r) return null;
          const pad = 6;
          return (
            <rect key={`a-${i}`} className="annotation-path"
              x={r.x - pad + wobble()} y={r.y - pad + wobble()}
              width={r.width + pad * 2} height={r.height + pad * 2} rx={4}
              fill="none" stroke={ann.color || "#22c55e"} strokeWidth={2.5} strokeLinecap="round"
            />
          );
        }

        if (ann.type === "crossOut" && ann.target != null) {
          const r = getRect(ann.target);
          if (!r) return null;
          return (
            <g key={`a-${i}`}>
              <line className="annotation-path"
                x1={r.x - 4} y1={r.y - 4} x2={r.x + r.width + 4} y2={r.y + r.height + 4}
                stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round"
              />
              <line className="annotation-path"
                x1={r.x + r.width + 4} y1={r.y - 4} x2={r.x - 4} y2={r.y + r.height + 4}
                stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round"
              />
            </g>
          );
        }

        return null;
      })}
    </svg>
  );
}
