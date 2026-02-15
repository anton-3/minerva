// SandboxPanel — renders Claude-generated HTML/CSS/JS in a sandboxed iframe
// Used for non-math subjects: physics sims, chemistry diagrams, history timelines, etc.
// Security: allow-scripts only (no allow-same-origin) — iframe cannot access parent.
// Features: shimmer loading state while thinking, crossfade on new content.

"use client";

import { useState, useEffect, useRef } from "react";

interface SandboxPanelProps {
  html: string | null;
  isThinking?: boolean;
}

export function SandboxPanel({ html, isThinking }: SandboxPanelProps) {
  const [visible, setVisible] = useState(false);
  const prevHtml = useRef<string | null>(null);

  // Fade in when new HTML arrives
  useEffect(() => {
    if (html && html !== prevHtml.current) {
      setVisible(false);
      const timer = setTimeout(() => setVisible(true), 80);
      prevHtml.current = html;
      return () => clearTimeout(timer);
    }
    if (!html) {
      setVisible(false);
      prevHtml.current = null;
    }
  }, [html]);

  // Show shimmer when thinking and no content yet
  if (isThinking && !html) {
    return <LoadingShimmer />;
  }

  if (!html) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-brand-primary/30 mx-auto mb-4"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <p className="text-text-secondary/60 text-sm">
            Interactive content will appear here
          </p>
          <p className="text-text-secondary/40 text-xs mt-1">
            Ask about physics, chemistry, history, or any topic
          </p>
        </div>
      </div>
    );
  }

  // Lightweight viewport CSS — handles SVG/canvas display, scrollbars, and
  // a compact Tailwind-like utility layer so Claude can use utility classes.
  const viewportCss = `<style>
svg{display:block;max-width:100%;max-height:100%;}
canvas{display:block;max-width:100%;max-height:100%;}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.1);border-radius:3px}
/* Tailwind-like utilities — compact subset for Claude-generated HTML */
.flex{display:flex}.inline-flex{display:inline-flex}.grid{display:grid}.hidden{display:none}.block{display:block}.inline-block{display:inline-block}
.flex-col{flex-direction:column}.flex-row{flex-direction:row}.flex-wrap{flex-wrap:wrap}
.items-center{align-items:center}.items-start{align-items:flex-start}.items-end{align-items:flex-end}.items-stretch{align-items:stretch}
.justify-center{justify-content:center}.justify-between{justify-content:space-between}.justify-start{justify-content:flex-start}.justify-end{justify-content:flex-end}.justify-around{justify-content:space-around}
.self-center{align-self:center}.self-start{align-self:flex-start}.self-end{align-self:flex-end}
.flex-1{flex:1 1 0%}.flex-auto{flex:1 1 auto}.flex-none{flex:none}.grow{flex-grow:1}.shrink-0{flex-shrink:0}
.gap-1{gap:0.25rem}.gap-2{gap:0.5rem}.gap-3{gap:0.75rem}.gap-4{gap:1rem}.gap-5{gap:1.25rem}.gap-6{gap:1.5rem}.gap-8{gap:2rem}.gap-10{gap:2.5rem}.gap-12{gap:3rem}
.grid-cols-1{grid-template-columns:repeat(1,1fr)}.grid-cols-2{grid-template-columns:repeat(2,1fr)}.grid-cols-3{grid-template-columns:repeat(3,1fr)}.grid-cols-4{grid-template-columns:repeat(4,1fr)}
.col-span-2{grid-column:span 2/span 2}.col-span-3{grid-column:span 3/span 3}.col-span-full{grid-column:1/-1}
.p-1{padding:0.25rem}.p-2{padding:0.5rem}.p-3{padding:0.75rem}.p-4{padding:1rem}.p-5{padding:1.25rem}.p-6{padding:1.5rem}.p-8{padding:2rem}
.px-1{padding-left:0.25rem;padding-right:0.25rem}.px-2{padding-left:0.5rem;padding-right:0.5rem}.px-3{padding-left:0.75rem;padding-right:0.75rem}.px-4{padding-left:1rem;padding-right:1rem}.px-5{padding-left:1.25rem;padding-right:1.25rem}.px-6{padding-left:1.5rem;padding-right:1.5rem}.px-8{padding-left:2rem;padding-right:2rem}
.py-1{padding-top:0.25rem;padding-bottom:0.25rem}.py-2{padding-top:0.5rem;padding-bottom:0.5rem}.py-3{padding-top:0.75rem;padding-bottom:0.75rem}.py-4{padding-top:1rem;padding-bottom:1rem}.py-6{padding-top:1.5rem;padding-bottom:1.5rem}.py-8{padding-top:2rem;padding-bottom:2rem}
.m-0{margin:0}.m-auto{margin:auto}.mx-auto{margin-left:auto;margin-right:auto}.my-2{margin-top:0.5rem;margin-bottom:0.5rem}.my-4{margin-top:1rem;margin-bottom:1rem}
.mt-1{margin-top:0.25rem}.mt-2{margin-top:0.5rem}.mt-3{margin-top:0.75rem}.mt-4{margin-top:1rem}.mt-6{margin-top:1.5rem}.mt-8{margin-top:2rem}
.mb-1{margin-bottom:0.25rem}.mb-2{margin-bottom:0.5rem}.mb-3{margin-bottom:0.75rem}.mb-4{margin-bottom:1rem}.mb-6{margin-bottom:1.5rem}.mb-8{margin-bottom:2rem}
.ml-1{margin-left:0.25rem}.ml-2{margin-left:0.5rem}.ml-auto{margin-left:auto}.mr-1{margin-right:0.25rem}.mr-2{margin-right:0.5rem}.mr-auto{margin-right:auto}
.w-full{width:100%}.w-auto{width:auto}.w-1\\/2{width:50%}.w-1\\/3{width:33.333%}.w-2\\/3{width:66.667%}
.h-full{height:100%}.h-auto{height:auto}.h-screen{height:100vh}
.min-h-0{min-height:0}.min-h-screen{min-height:100vh}.max-w-sm{max-width:24rem}.max-w-md{max-width:28rem}.max-w-lg{max-width:32rem}.max-w-xl{max-width:36rem}.max-w-2xl{max-width:42rem}.max-w-4xl{max-width:56rem}
.text-xs{font-size:0.75rem;line-height:1rem}.text-sm{font-size:0.875rem;line-height:1.25rem}.text-base{font-size:1rem;line-height:1.5rem}.text-lg{font-size:1.125rem;line-height:1.75rem}.text-xl{font-size:1.25rem;line-height:1.75rem}.text-2xl{font-size:1.5rem;line-height:2rem}.text-3xl{font-size:1.875rem;line-height:2.25rem}.text-4xl{font-size:2.25rem;line-height:2.5rem}
.font-normal{font-weight:400}.font-medium{font-weight:500}.font-semibold{font-weight:600}.font-bold{font-weight:700}
.text-center{text-align:center}.text-left{text-align:left}.text-right{text-align:right}
.leading-tight{line-height:1.25}.leading-snug{line-height:1.375}.leading-normal{line-height:1.5}.leading-relaxed{line-height:1.625}.leading-loose{line-height:2}
.tracking-tight{letter-spacing:-0.025em}.tracking-wide{letter-spacing:0.025em}
.uppercase{text-transform:uppercase}.lowercase{text-transform:lowercase}.capitalize{text-transform:capitalize}
.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.line-clamp-2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.line-clamp-3{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.text-white{color:#fff}.text-black{color:#000}.text-gray-400{color:#9ca3af}.text-gray-500{color:#6b7280}.text-gray-600{color:#4b5563}.text-gray-700{color:#374151}.text-gray-800{color:#1f2937}.text-gray-900{color:#111827}
.bg-white{background:#fff}.bg-black{background:#000}.bg-gray-50{background:#f9fafb}.bg-gray-100{background:#f3f4f6}.bg-gray-200{background:#e5e7eb}.bg-gray-800{background:#1f2937}.bg-gray-900{background:#111827}
.bg-blue-50{background:#eff6ff}.bg-blue-100{background:#dbeafe}.bg-blue-500{background:#3b82f6}.bg-green-50{background:#f0fdf4}.bg-green-100{background:#dcfce7}.bg-green-500{background:#22c55e}.bg-amber-50{background:#fffbeb}.bg-amber-100{background:#fef3c7}.bg-amber-500{background:#f59e0b}.bg-red-50{background:#fef2f2}.bg-red-100{background:#fee2e2}.bg-red-500{background:#ef4444}.bg-purple-50{background:#faf5ff}.bg-purple-100{background:#f3e8ff}.bg-purple-500{background:#a855f7}
.text-blue-500{color:#3b82f6}.text-blue-600{color:#2563eb}.text-green-500{color:#22c55e}.text-green-600{color:#16a34a}.text-amber-500{color:#f59e0b}.text-amber-600{color:#d97706}.text-red-500{color:#ef4444}.text-red-600{color:#dc2626}.text-purple-500{color:#a855f7}.text-purple-600{color:#9333ea}
.border{border:1px solid #e5e7eb}.border-2{border:2px solid #e5e7eb}.border-t{border-top:1px solid #e5e7eb}.border-b{border-bottom:1px solid #e5e7eb}.border-l{border-left:1px solid #e5e7eb}.border-l-2{border-left:2px solid currentColor}.border-l-4{border-left:4px solid currentColor}
.border-gray-100{border-color:#f3f4f6}.border-gray-200{border-color:#e5e7eb}.border-gray-300{border-color:#d1d5db}.border-blue-200{border-color:#bfdbfe}.border-blue-500{border-color:#3b82f6}.border-green-200{border-color:#bbf7d0}.border-amber-200{border-color:#fde68a}.border-red-200{border-color:#fecaca}.border-purple-200{border-color:#e9d5ff}
.rounded{border-radius:0.25rem}.rounded-md{border-radius:0.375rem}.rounded-lg{border-radius:0.5rem}.rounded-xl{border-radius:0.75rem}.rounded-2xl{border-radius:1rem}.rounded-3xl{border-radius:1.5rem}.rounded-full{border-radius:9999px}
.shadow-sm{box-shadow:0 1px 2px rgba(0,0,0,0.05)}.shadow{box-shadow:0 1px 3px rgba(0,0,0,0.1),0 1px 2px rgba(0,0,0,0.06)}.shadow-md{box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06)}.shadow-lg{box-shadow:0 10px 15px -3px rgba(0,0,0,0.1),0 4px 6px -2px rgba(0,0,0,0.05)}
.overflow-hidden{overflow:hidden}.overflow-auto{overflow:auto}.overflow-x-auto{overflow-x:auto}.overflow-y-auto{overflow-y:auto}
.relative{position:relative}.absolute{position:absolute}.fixed{position:fixed}.sticky{position:sticky}
.inset-0{inset:0}.top-0{top:0}.right-0{right:0}.bottom-0{bottom:0}.left-0{left:0}
.z-10{z-index:10}.z-20{z-index:20}.z-50{z-index:50}
.opacity-0{opacity:0}.opacity-25{opacity:0.25}.opacity-50{opacity:0.5}.opacity-75{opacity:0.75}.opacity-100{opacity:1}
.transition-all{transition:all 0.15s ease}.transition-colors{transition:color,background-color,border-color 0.15s ease}.transition-opacity{transition:opacity 0.15s ease}.transition-transform{transition:transform 0.15s ease}
.duration-150{transition-duration:150ms}.duration-200{transition-duration:200ms}.duration-300{transition-duration:300ms}.duration-500{transition-duration:500ms}
.scale-95{transform:scale(0.95)}.scale-100{transform:scale(1)}.scale-105{transform:scale(1.05)}
.rotate-45{transform:rotate(45deg)}.rotate-90{transform:rotate(90deg)}.rotate-180{transform:rotate(180deg)}
.-translate-y-1{transform:translateY(-0.25rem)}.translate-y-0{transform:translateY(0)}
.cursor-pointer{cursor:pointer}.select-none{user-select:none}.pointer-events-none{pointer-events:none}
.whitespace-nowrap{white-space:nowrap}.break-words{overflow-wrap:break-word}
.list-none{list-style:none}.list-disc{list-style:disc}.list-decimal{list-style:decimal}
.space-y-1>*+*{margin-top:0.25rem}.space-y-2>*+*{margin-top:0.5rem}.space-y-3>*+*{margin-top:0.75rem}.space-y-4>*+*{margin-top:1rem}.space-y-6>*+*{margin-top:1.5rem}
.space-x-1>*+*{margin-left:0.25rem}.space-x-2>*+*{margin-left:0.5rem}.space-x-3>*+*{margin-left:0.75rem}.space-x-4>*+*{margin-left:1rem}
.aspect-square{aspect-ratio:1/1}.aspect-video{aspect-ratio:16/9}
.object-cover{object-fit:cover}.object-contain{object-fit:contain}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
</style>`;

  // Forward Space key events from iframe to parent for push-to-talk.
  // The sandboxed iframe captures focus on click, so the parent window
  // never sees keydown/keyup events. This script bridges that gap.
  const pttBridge = `<script>
document.addEventListener('keydown',function(e){
if(e.code==='Space'&&!e.repeat){
var t=e.target&&e.target.tagName;
if(t==='INPUT'||t==='TEXTAREA')return;
e.preventDefault();
parent.postMessage({type:'ptt',action:'down'},'*');
}
});
document.addEventListener('keyup',function(e){
if(e.code==='Space'){
var t=e.target&&e.target.tagName;
if(t==='INPUT'||t==='TEXTAREA')return;
e.preventDefault();
parent.postMessage({type:'ptt',action:'up'},'*');
}
});
</script>`;

  const enrichedHtml = viewportCss + pttBridge + html;

  return (
    <div className="w-full h-full relative">
      {/* Thinking indicator — thin pulsing bar at top */}
      {isThinking && (
        <div className="absolute top-0 left-0 right-0 z-10 h-0.5 bg-brand-primary/20 overflow-hidden">
          <div className="h-full bg-brand-primary/50 animate-pulse" />
        </div>
      )}
      <div
        className="w-full h-full transition-opacity duration-300 ease-out"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <iframe
          srcDoc={enrichedHtml}
          sandbox="allow-scripts"
          className="w-full h-full border-0"
          style={{ background: "#F7F9FC" }}
          title="Interactive lesson content"
        />
      </div>
    </div>
  );
}

/** Pulsing shimmer skeleton — mimics the typical page layout while content generates */
function LoadingShimmer() {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ padding: "5vh 5vw" }}>
      <div className="w-full max-w-220 flex flex-col gap-6 animate-pulse">
        {/* Hero visual placeholder */}
        <div className="w-full rounded-2xl bg-brand-primary/8 border border-border-light" style={{ height: "40vh" }} />
        {/* Card grid placeholder */}
        <div className="grid grid-cols-2 gap-4">
          <div className="h-28 rounded-2xl bg-brand-primary/5 border border-border-light" />
          <div className="h-28 rounded-2xl bg-brand-primary/5 border border-border-light" />
        </div>
        {/* Callout placeholder */}
        <div className="h-20 rounded-2xl bg-brand-primary/4 border border-border-light" />
      </div>
    </div>
  );
}
