"use client";

import { useEffect, useRef } from "react";

export default function LandingPage() {
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-on-scroll-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05 }
    );

    const el = mainRef.current;
    if (el) {
      el.querySelectorAll("[data-aos]").forEach((node) => {
        node.classList.add("animate-on-scroll-hidden");
        observer.observe(node);
      });
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={mainRef} className="font-primary bg-neutral-background text-text-primary overflow-x-hidden">
      {/* ───────────────────────── 1. NAVBAR ───────────────────────── */}
      <header
        className="fixed top-0 left-0 w-full z-50 py-3"
        style={{
          backgroundColor: "rgba(247, 249, 252, 0.64)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
        }}
      >
        <nav className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <a
            href="/"
            className="text-xl font-heading font-semibold text-text-primary flex items-center gap-2"
          >
            <span className="text-brand-primary">🦉</span> Minerva AI
          </a>

          <div className="hidden md:flex items-center gap-2">
            <a
              href="#how-it-works"
              className="px-4 py-2 text-sm font-medium text-text-primary rounded-md hover:bg-black/5 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#canvas"
              className="px-4 py-2 text-sm font-medium text-text-primary rounded-md hover:bg-black/5 transition-colors"
            >
              Interactive Canvas
            </a>
            <a
              href="#dashboard"
              className="px-4 py-2 text-sm font-medium text-text-primary rounded-md hover:bg-black/5 transition-colors"
            >
              Parent Portal
            </a>
          </div>

          <a
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-text-primary text-white font-medium text-sm rounded-sm hover:shadow-soft transition-all hover:-translate-y-0.5"
          >
            Start Learning
          </a>
        </nav>
      </header>

      <main>
        {/* ───────────────────────── 2. HERO ───────────────────────── */}
        <section className="hero-gradient pt-40 pb-16 px-6 relative overflow-hidden">
          {/* Blur gradient blob */}
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-[1220px] h-[543px] blur-gradient rounded-full -rotate-12 z-0" />

          <div className="max-w-7xl mx-auto relative z-10">
            {/* Announcement badge */}
            <div className="flex justify-center mb-10" data-aos>
              <a
                href="/login"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-accent/20 rounded-lg text-sm text-text-primary hover:scale-105 transition-transform"
              >
                <span className="font-medium">
                  ✨ Meet Minerva: The Future of Socratic Learning
                </span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>

            {/* Hero heading */}
            <div className="max-w-4xl mx-auto text-center mb-16" data-aos>
              <h1 className="font-heading text-6xl md:text-7xl lg:text-8xl font-normal tracking-mega-tight leading-none mb-6">
                Every Child Deserves a{" "}
                <span className="italic text-brand-primary">
                  brilliant, patient educator
                </span>
              </h1>
              <p className="text-lg md:text-xl text-text-primary leading-relaxed max-w-2xl mx-auto mb-10">
                Lifelike AI avatars that educate the Socratic way. Real-time
                voice conversations, interactive math modules, and 100% adaptive
                curriculum. Built with Zoom, HeyGen, Claude, and more!
              </p>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="/login"
                  className="w-full sm:w-auto px-8 py-4 bg-text-primary text-white font-medium text-base rounded-sm hover:shadow-soft transition-all hover:-translate-y-0.5"
                >
                  Start your journey
                </a>
                <a
                  href="/login"
                  className="w-full sm:w-auto px-8 py-4 bg-transparent text-text-primary font-medium text-base rounded-sm hover:bg-black/5 transition-all flex items-center justify-center gap-2"
                >
                  Watch demo
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M10 8l6 4-6 4V8z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Product mockup */}
            <div className="max-w-5xl mx-auto" data-aos>
              <div className="bg-white/30 rounded-xl md:rounded-2xl p-2 md:p-3 shadow-medium">
                <div className="aspect-video bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-lg md:rounded-xl overflow-hidden relative">
                  {/* Window chrome */}
                  <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="bg-gray-700 rounded px-4 py-1.5 text-[10px] md:text-xs text-gray-300 font-mono">
                      SESSION: Calculus Part 1 • Socratic Method Active
                    </div>
                    <div className="text-brand-primary text-xs font-bold animate-pulse">
                      LIVE VOICE
                    </div>
                  </div>

                  {/* Simulation content */}
                  <div className="grid grid-cols-1 md:grid-cols-3 h-full pb-12">
                    {/* Left: AI Avatar */}
                    <div className="relative overflow-hidden flex items-center justify-center bg-gray-900 border-r border-gray-700">
                      <video
                        src="/avatar-preview.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover opacity-80"
                        aria-label="AI Mentor Minerva"
                      />
                      <div className="absolute bottom-4 left-4 right-4 bg-black/40 backdrop-blur-md p-3 rounded-lg border border-white/10">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            <div className="w-1 h-3 bg-brand-primary animate-bounce" />
                            <div
                              className="w-1 h-5 bg-brand-primary animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            />
                            <div
                              className="w-1 h-2 bg-brand-primary animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            />
                          </div>
                          <p className="text-[10px] md:text-xs text-white leading-tight font-medium">
                            &ldquo;Can you explain why the slope here must be
                            negative?&rdquo;
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right: Interactive Canvas */}
                    <div className="md:col-span-2 bg-gray-50 flex flex-col">
                      <div className="flex-1 p-4 relative overflow-hidden">
                        {/* Simulated Desmos */}
                        <div className="w-full h-full border border-gray-200 rounded-lg bg-white relative shadow-inner overflow-hidden">
                          <div className="p-2 border-b border-gray-100 flex justify-between bg-gray-50/50">
                            <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">
                              Desmos Render Engine
                            </span>
                            <div className="flex gap-1">
                              <div className="w-4 h-4 rounded bg-gray-200" />
                              <div className="w-4 h-4 rounded bg-gray-200" />
                            </div>
                          </div>
                          {/* Dot grid */}
                          <div
                            className="absolute inset-0 opacity-10"
                            style={{
                              backgroundImage:
                                "radial-gradient(#92A0E1 1px, transparent 1px)",
                              backgroundSize: "20px 20px",
                            }}
                          />
                          {/* SVG graph */}
                          <svg
                            className="absolute inset-0 w-full h-full overflow-visible"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                          >
                            <path
                              d="M 0,80 Q 25,10 50,50 T 100,20"
                              fill="none"
                              stroke="#92A0E1"
                              strokeWidth="1.5"
                            />
                            <circle cx="50" cy="50" r="2" fill="#C2A0E1">
                              <animate
                                attributeName="r"
                                values="2;4;2"
                                dur="2s"
                                repeatCount="indefinite"
                              />
                            </circle>
                          </svg>
                          {/* Floating equation card */}
                          <div className="absolute top-12 left-6 bg-white shadow-xl rounded-md p-3 border border-border-light z-20 animate-float">
                            <p className="text-xs font-mono text-gray-800 font-bold">
                              f(x) = sin(x) + cos(0.5x)
                            </p>
                            <p className="text-[9px] text-text-secondary mt-1 italic">
                              Click to intersect
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Mastery progress bar */}
                      <div className="h-12 bg-white border-t border-gray-200 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-500">
                            MASTERY
                          </span>
                          <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-primary"
                              style={{ width: "65%" }}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded">
                            CONCEPT CLEAR
                          </span>
                          <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-[9px] font-bold rounded">
                            ADAPTING CURRICULUM...
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subtle glow overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-primary via-brand-secondary to-transparent opacity-10 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────── 3. HOW IT WORKS (SOCRATIC EDGE) ───────────────── */}
        <section
          className="py-20 bg-neutral-surface overflow-hidden"
          id="how-it-works"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Left: features list */}
              <div data-aos>
                <div className="inline-block px-3 py-1.5 bg-brand-accent/20 rounded text-xs font-mono font-medium text-text-primary uppercase tracking-wide mb-6">
                  The Socratic Edge
                </div>
                <h2 className="font-heading text-4xl md:text-5xl font-normal tracking-tighter leading-tight mb-6">
                  She doesn&apos;t just give answers.{" "}
                  <br />
                  <span className="text-brand-primary italic">
                    She teaches how to think.
                  </span>
                </h2>
                <div className="space-y-8">
                  {/* Feature 1 */}
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-white rounded-lg shadow-soft flex items-center justify-center shrink-0 text-2xl">
                      🤝
                    </div>
                    <div>
                      <h3 className="font-heading text-xl font-semibold mb-2">
                        Patience of a Saint
                      </h3>
                      <p className="text-text-secondary leading-relaxed">
                        Minerva never gets frustrated. She will rephrase,
                        illustrate, and guide a student through a concept 100
                        times if that&apos;s what it takes to reach that
                        &lsquo;Aha!&rsquo; moment.
                      </p>
                    </div>
                  </div>
                  {/* Feature 2 */}
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-white rounded-lg shadow-soft flex items-center justify-center shrink-0 text-2xl">
                      ❓
                    </div>
                    <div>
                      <h3 className="font-heading text-xl font-semibold mb-2">
                        Masterful Inquiry
                      </h3>
                      <p className="text-text-secondary leading-relaxed">
                        Powered by Claude 4.5, our AI uses the Socratic method
                        to break down complex problems into manageable questions,
                        building genuine understanding.
                      </p>
                    </div>
                  </div>
                  {/* Feature 3 */}
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-white rounded-lg shadow-soft flex items-center justify-center shrink-0 text-2xl">
                      🗣️
                    </div>
                    <div>
                      <h3 className="font-heading text-xl font-semibold mb-2">
                        Natural Conversation
                      </h3>
                      <p className="text-text-secondary leading-relaxed">
                        Latency-free voice via HeyGen ensures the flow of
                        conversation feels human, making learning a social,
                        engaging experience rather than a chore.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: chat mockup */}
              <div className="relative" data-aos>
                <div className="aspect-square gradient-peach rounded-2xl p-8 flex items-center justify-center">
                  <div className="bg-white rounded-xl shadow-medium p-4 w-full space-y-4">
                    {/* Chat header */}
                    <div className="flex items-center gap-3 border-b border-border-light pb-3">
                      <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center text-xl">
                        🦉
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-400">
                          MINERVA
                        </div>
                        <div className="text-[10px] text-green-500 font-mono italic">
                          Thinking...
                        </div>
                      </div>
                    </div>
                    {/* Chat messages */}
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-brand-primary">
                        <p className="text-sm font-medium italic">
                          &ldquo;Great observation on the x-intercept! Now, if
                          we increase the constant &lsquo;c&rsquo;, which way do
                          you think the whole curve will shift?&rdquo;
                        </p>
                      </div>
                      <div className="flex justify-end">
                        <div className="bg-brand-primary text-white p-3 rounded-lg rounded-tr-none text-sm max-w-[80%]">
                          &ldquo;Um, maybe it goes up? Because we&apos;re adding
                          more to every point?&rdquo;
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-brand-secondary">
                        <p className="text-sm font-medium italic">
                          &ldquo;Exactly! Let&apos;s watch the graph and see if
                          you&apos;re right...&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────── 4. INTERACTIVE CANVAS ───────────────── */}
        <section className="py-24 bg-neutral-background px-6" id="canvas">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16" data-aos>
              <h2 className="font-heading text-4xl md:text-5xl font-normal tracking-tighter mb-4">
                Precision visualization tools.
              </h2>
              <p className="text-text-secondary max-w-2xl mx-auto">
                Minerva controls a live digital workspace. When she talks about a
                parabola, she draws it. When you manipulate a slider, she
                explains the change.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div
                className="bg-neutral-surface p-8 rounded-2xl border border-border-light hover:border-brand-primary transition-colors group"
                data-aos
              >
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">
                  📉
                </div>
                <h3 className="font-heading text-xl font-semibold mb-2">
                  Desmos Integration
                </h3>
                <p className="text-sm text-text-secondary">
                  High-fidelity graphing for algebra, calculus, and trigonometry.
                  See functions come to life instantly.
                </p>
              </div>
              <div
                className="bg-neutral-surface p-8 rounded-2xl border border-border-light hover:border-brand-primary transition-colors group"
                data-aos
                style={{ transitionDelay: "0.1s" }}
              >
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">
                  📐
                </div>
                <h3 className="font-heading text-xl font-semibold mb-2">
                  GeoGebra Constructions
                </h3>
                <p className="text-sm text-text-secondary">
                  Interactive geometry. Drag points, measure angles, and prove
                  theorems in an environment that understands math.
                </p>
              </div>
              <div
                className="bg-neutral-surface p-8 rounded-2xl border border-border-light hover:border-brand-primary transition-colors group"
                data-aos
                style={{ transitionDelay: "0.2s" }}
              >
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">
                  ✍️
                </div>
                <h3 className="font-heading text-xl font-semibold mb-2">
                  Dynamic Rendering
                </h3>
                <p className="text-sm text-text-secondary">
                  No static slides. Every visual is generated on-the-fly based on
                  the student&apos;s specific struggle or question.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────── 5. PARENT PORTAL (DARK) ───────────────── */}
        <section
          className="py-24 bg-neutral-dark text-white rounded-[2rem] mx-4 md:mx-12 overflow-hidden"
          id="dashboard"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Left: session summary card */}
              <div className="order-2 lg:order-1" data-aos>
                <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="font-heading text-xl font-semibold">
                      Session Summary: Leo W.
                    </h4>
                    <span className="text-xs bg-brand-primary/20 text-brand-primary px-3 py-1 rounded-full border border-brand-primary/30">
                      February 14, 2026
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <div className="text-xs text-gray-400 mb-1">
                        Engagement Score
                      </div>
                      <div className="text-2xl font-bold font-heading text-brand-secondary">
                        94%
                      </div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <div className="text-xs text-gray-400 mb-1">
                        Comprehension
                      </div>
                      <div className="text-2xl font-bold font-heading text-green-400">
                        Mastered
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-sm font-medium text-gray-300">
                      AI Narrative Summary:
                    </div>
                    <p className="text-xs leading-relaxed text-gray-400 italic">
                      &ldquo;Leo initially struggled with the concept of limits
                      as they approach infinity. Through our conversation, he
                      correctly identified that the vertical asymptote occurs
                      when the denominator is zero. He is ready to move on to
                      Derivatives.&rdquo;
                    </p>
                    <div className="pt-4 border-t border-white/10">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">
                          Personalized Goal: SAT Math Prep
                        </span>
                        <span className="text-brand-primary">65% Progress</span>
                      </div>
                      <div className="w-full h-1 bg-white/10 rounded-full mt-2">
                        <div className="h-full bg-brand-primary w-[65%] rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: copy */}
              <div className="order-1 lg:order-2" data-aos>
                <div className="inline-block px-3 py-1.5 bg-brand-primary/20 rounded text-xs font-mono font-medium text-brand-primary uppercase tracking-wide mb-6">
                  Parental Peace of Mind
                </div>
                <h2 className="font-heading text-4xl md:text-5xl font-normal tracking-tighter leading-tight mb-6">
                  Visibility into every{" "}
                  <span className="italic text-brand-secondary">
                    breakthrough.
                  </span>
                </h2>
                <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                  Stop wondering what&apos;s happening during education sessions.
                  Get deep, AI-driven insights into your child&apos;s confidence,
                  engagement, and actual mastery of subjects.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-[10px] text-green-400">
                      ✓
                    </div>
                    <span className="text-gray-300 text-sm">
                      Set custom curriculum and goals (SAT, AP, State Exams)
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-[10px] text-green-400">
                      ✓
                    </div>
                    <span className="text-gray-300 text-sm">
                      Real-time alerts for persistence roadblocks
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-[10px] text-green-400">
                      ✓
                    </div>
                    <span className="text-gray-300 text-sm">
                      Weekly progress reports sent via WhatsApp/Email
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────── 6. FAQ ───────────────── */}
        <section className="py-24 bg-neutral-surface px-6" id="faq">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-heading text-3xl md:text-4xl text-center mb-12">
              Questions? We have answers.
            </h2>
            <div className="space-y-6">
              <div
                className="bg-white p-6 rounded-xl border border-border-light"
                data-aos
              >
                <h4 className="font-bold text-text-primary mb-2">
                  How &ldquo;lifelike&rdquo; is the avatar?
                </h4>
                <p className="text-sm text-text-secondary">
                  Powered by HeyGen&apos;s streaming technology, Minerva blinks,
                  expresses emotions, and syncs her speech perfectly to her
                  voice. Students often forget they are talking to an AI within
                  the first 5 minutes.
                </p>
              </div>
              <div
                className="bg-white p-6 rounded-xl border border-border-light"
                data-aos
              >
                <h4 className="font-bold text-text-primary mb-2">
                  Can it help with competitive exams like SAT or AP?
                </h4>
                <p className="text-sm text-text-secondary">
                  Yes. Our curriculum engine includes dedicated modules for SAT
                  Math and multiple AP subjects (BC Calculus, Statistics,
                  Physics), with practice problems from past exams.
                </p>
              </div>
              <div
                className="bg-white p-6 rounded-xl border border-border-light"
                data-aos
              >
                <h4 className="font-bold text-text-primary mb-2">
                  What if my child gets stuck?
                </h4>
                <p className="text-sm text-text-secondary">
                  Minerva is specifically tuned to recognize frustration. If a
                  student is stuck, she will drop the Socratic method temporarily
                  to offer a supportive hint or visualize the concepts in a
                  different way on the canvas, ensuring the education process
                  remains fluid.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ───────────────── 7. FOOTER ───────────────── */}
      <footer className="bg-neutral-surface pt-16 pb-8 border-t border-border-light">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="text-sm text-text-secondary">
              © 2026 Minerva AI Education. Powered by Zoom APIs, HeyGen, &amp; Claude.
            </p>
            <div className="flex gap-6">
              <a
                href="#"
                className="text-sm text-text-secondary hover:text-brand-primary"
              >
                Privacy
              </a>
              <a
                href="#"
                className="text-sm text-text-secondary hover:text-brand-primary"
              >
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
