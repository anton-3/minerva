// Sandbox HTML template builder
// Wraps the AI's content body with pre-loaded libraries for high-quality visualizations.
// Libraries loaded from /sandbox/ public directory:
// - Chart.js 4.x (201KB) — bar, pie, line, scatter, radar charts
// - Matter.js 0.20 (82KB) — 2D physics engine (gravity, collisions, springs)
// - GSAP 3.x (73KB) — smooth animations (tweens, timelines, staggers)
// - Water.css dark (10KB) — classless dark theme for HTML controls
//
// NOTE: Inline sandbox blocks (in StepsPanel) also use this template via buildSandboxSrcdoc().

const ACCENT_COLORS: Record<string, string> = {
  physics: '#3B82F6',
  chemistry: '#10B981',
  biology: '#22C55E',
  history: '#F59E0B',
  literature: '#A855F7',
  geography: '#06B6D4',
  economics: '#F97316',
  finance: '#F97316',
  cs: '#8B5CF6',
  general: '#06B6D4',
};

/**
 * Builds a complete HTML document from the AI's content body.
 * Pre-loads Chart.js, Matter.js, GSAP, and Water.css for high-quality visualizations.
 *
 * @param content - HTML content body (what the AI generates)
 * @param accent - Subject name for accent color (physics, chemistry, etc.)
 * @returns Complete HTML document string
 */
export function buildSandboxHtml(content: string, accent: string = 'general'): string {
  const accentColor = ACCENT_COLORS[accent.toLowerCase()] || ACCENT_COLORS.general;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="/sandbox/water.dark.min.css">
  <script src="/sandbox/chart.min.js"><\/script>
  <script src="/sandbox/matter.min.js"><\/script>
  <script src="/sandbox/gsap.min.js"><\/script>
  <style>
    :root { --accent: ${accentColor}; }
    body {
      background: #1a1a2e;
      color: rgba(255,255,255,0.9);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      margin: 0;
      padding: 16px;
    }
    * { box-sizing: border-box; }
    h1, h2, h3 { color: var(--accent); }
    canvas { display: block; max-width: 100%; }
    .accent { color: var(--accent); }
    .card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
    }
    input[type="range"] { accent-color: var(--accent); width: 100%; }
    button { cursor: pointer; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
  </style>
</head>
<body>
  ${content}
  <script>
    // Forward Space key to parent for push-to-talk
    document.addEventListener('keydown', function(e) {
      if (e.code === 'Space') {
        window.parent.postMessage({ type: 'ptt', action: 'down' }, '*');
      }
    });
    document.addEventListener('keyup', function(e) {
      if (e.code === 'Space') {
        window.parent.postMessage({ type: 'ptt', action: 'up' }, '*');
      }
    });
  <\/script>
</body>
</html>`;
}

/**
 * Builds srcdoc HTML for inline sandbox blocks in StepsPanel.
 * Same as buildSandboxHtml but used directly in iframe srcDoc attribute.
 */
export function buildSandboxSrcdoc(html: string, accent?: string): string {
  return buildSandboxHtml(html, accent);
}
