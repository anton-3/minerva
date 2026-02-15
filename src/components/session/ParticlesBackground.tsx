// ParticlesBackground — neural network canvas with varied nodes and curved connections
// Nodes: continuous size distribution from tiny synapses to large neurons.
// Connections: curved bezier lines that ease in/out smoothly.
// Grab: mouse proximity draws organic curved connections to nearby nodes.

"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  opacity: number;
  // For smooth grab — current connection strength to mouse (0→1, animated)
  grabStrength: number;
}

export function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // --- Config ---
    const COUNT = 90;
    const LINK_DIST = 160;
    const GRAB_DIST = 220;
    const LINE_COLOR = "130, 150, 200";
    const NEURON_COLOR = "100, 120, 190";
    const NODE_COLOR = "155, 170, 210";
    const GRAB_EASE = 0.08; // how fast grab fades in/out (0→1 per frame lerp)
    const PULL_FORCE = 0.015; // how strongly mouse pulls nearby nodes
    const MAX_SPEED = 2.5; // velocity cap so nodes don't fly off

    let animId: number;
    let mouse = { x: -9999, y: -9999 };
    let particles: Particle[] = [];
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Weighted random: more small nodes, fewer large ones
    const randomSize = (): number => {
      const r = Math.random();
      if (r < 0.40) return Math.random() * 0.8 + 0.5;   // tiny  (0.5-1.3)
      if (r < 0.70) return Math.random() * 1.0 + 1.3;   // small (1.3-2.3)
      if (r < 0.88) return Math.random() * 1.2 + 2.3;   // medium (2.3-3.5)
      return Math.random() * 2.0 + 3.5;                   // large (3.5-5.5)
    };

    const init = () => {
      resize();
      particles = [];
      for (let i = 0; i < COUNT; i++) {
        const r = randomSize();
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          // Larger nodes drift slower
          vx: (Math.random() - 0.5) * (0.8 / (r * 0.5 + 0.5)),
          vy: (Math.random() - 0.5) * (0.8 / (r * 0.5 + 0.5)),
          r,
          opacity: 0.3 + r * 0.08, // bigger = more opaque
          grabStrength: 0,
        });
      }
    };

    // Curved line between two points — offset control point perpendicular
    const drawCurve = (
      x1: number, y1: number,
      x2: number, y2: number,
      curvature: number
    ) => {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      // Perpendicular offset
      const dx = x2 - x1;
      const dy = y2 - y1;
      const nx = -dy;
      const ny = dx;
      const len = Math.sqrt(nx * nx + ny * ny) || 1;
      const cx = mx + (nx / len) * curvature;
      const cy = my + (ny / len) * curvature;
      ctx.quadraticCurveTo(cx, cy, x2, y2);
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Update positions + mouse pull force
      const mouseActive = mouse.x > -9000;
      for (const p of particles) {
        // Gravitational pull toward mouse — smaller nodes pulled more
        if (mouseActive) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < GRAB_DIST && dist > 1) {
            const strength = (1 - dist / GRAB_DIST) * PULL_FORCE / (p.r * 0.3 + 0.5);
            p.vx += (dx / dist) * strength;
            p.vy += (dy / dist) * strength;
          }
        }

        // Clamp velocity so nodes don't fly off
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > MAX_SPEED) {
          p.vx = (p.vx / speed) * MAX_SPEED;
          p.vy = (p.vy / speed) * MAX_SPEED;
        }

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
      }

      // Animate grab strength — smooth ease toward target
      for (const p of particles) {
        let target = 0;
        if (mouseActive) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < GRAB_DIST) {
            target = 1 - dist / GRAB_DIST;
          }
        }
        // Lerp toward target — gives smooth fade in/out
        p.grabStrength += (target - p.grabStrength) * GRAB_EASE;
        if (p.grabStrength < 0.005) p.grabStrength = 0;
      }

      // --- Draw inter-particle links ---
      ctx.lineCap = "round";
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < LINK_DIST * LINK_DIST) {
            const dist = Math.sqrt(distSq);
            const t = 1 - dist / LINK_DIST;
            const alpha = t * t * 0.22; // quadratic falloff — softer edges
            const lineW = Math.min(a.r, b.r) * 0.25 + t * 0.6;

            // Slight curve proportional to node sizes (bigger nodes = more curve)
            const curvature = (a.r + b.r) * 1.5 * (t - 0.5);

            ctx.beginPath();
            ctx.strokeStyle = `rgba(${LINE_COLOR}, ${alpha})`;
            ctx.lineWidth = lineW;
            ctx.moveTo(a.x, a.y);
            drawCurve(a.x, a.y, b.x, b.y, curvature);
            ctx.stroke();
          }
        }
      }

      // --- Draw grab connections (curved, eased) ---
      if (mouseActive) {
        for (const p of particles) {
          if (p.grabStrength < 0.01) continue;
          const alpha = p.grabStrength * p.grabStrength * 0.45; // quadratic
          const lineW = 0.4 + p.grabStrength * p.r * 0.3;

          // Curve toward the node — bigger nodes get more curve
          const curvature = p.r * 3 * (p.grabStrength - 0.3);

          ctx.beginPath();
          ctx.strokeStyle = `rgba(${NEURON_COLOR}, ${alpha})`;
          ctx.lineWidth = lineW;
          ctx.moveTo(mouse.x, mouse.y);
          drawCurve(mouse.x, mouse.y, p.x, p.y, curvature);
          ctx.stroke();
        }
      }

      // --- Draw nodes ---
      for (const p of particles) {
        const isLarge = p.r > 2.8;

        if (isLarge) {
          // Outer glow ring
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r + 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${NEURON_COLOR}, 0.05)`;
          ctx.fill();
          // Mid ring
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r + 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${NEURON_COLOR}, 0.08)`;
          ctx.fill();
        }

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        const c = isLarge ? NEURON_COLOR : NODE_COLOR;
        ctx.fillStyle = `rgba(${c}, ${p.opacity})`;
        ctx.fill();

        // Grab highlight — node glows when mouse is near
        if (p.grabStrength > 0.01) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r + 2 + p.grabStrength * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${NEURON_COLOR}, ${p.grabStrength * 0.12})`;
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(draw);
    };

    const handleMouse = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    init();
    draw();

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouse);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
