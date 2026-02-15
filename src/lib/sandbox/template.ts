// Sandbox HTML template builder
// Wraps Claude's content body with Twind (Tailwind-in-JS) runtime.
// This reduces Claude's output from ~500 tokens to ~50-100 tokens per sandbox response.

const ACCENT_COLORS: Record<string, string> = {
  physics: '#3B82F6',
  chemistry: '#10B981',
  biology: '#22C55E',
  history: '#F59E0B',
  literature: '#A855F7',
  geography: '#06B6D4',
  economics: '#F97316',
  general: '#06B6D4',
};

/**
 * Builds a complete HTML document from Claude's content body.
 * Uses Twind CDN for Tailwind CSS support.
 * 
 * @param content - HTML content body (what Claude generates)
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
  <script src="https://cdn.twind.style" crossorigin></script>
  <script>
    twind.install({
      theme: {
        extend: {
          colors: {
            accent: '${accentColor}',
            card: 'rgba(255,255,255,0.04)',
            'card-border': 'rgba(255,255,255,0.08)',
          }
        }
      }
    });
  </script>
  <style>
    body {
      background: #0a0a0a;
      color: rgba(255,255,255,0.9);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
  </style>
</head>
<body class="min-h-screen p-6 md:p-10">
  <div class="max-w-4xl mx-auto flex flex-col gap-6">
    ${content}
  </div>
</body>
</html>`;
}
