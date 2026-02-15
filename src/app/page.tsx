"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Home() {
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

    document
      .querySelectorAll("[data-animation-on-scroll]")
      .forEach((el) => {
        el.classList.add("animate-on-scroll-hidden");
        observer.observe(el);
      });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="font-primary bg-neutral-background text-text-primary overflow-x-hidden">
      {/* ─── HEADER ─── */}
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
          <Link
            href="/"
            className="text-xl font-heading font-semibold text-text-primary flex items-center gap-2"
          >
            <span className="text-brand-primary">🦉</span> Minerva AI
          </Link>

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

          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-text-primary text-white font-medium text-sm rounded-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-0.5"
          >
            Start Learning
          </Link>
        </nav>
      </header>

      <main>
        {/* ─── HERO ─── */}
        <section className="hero-gradient pt-40 pb-16 px-6 relative overflow-hidden">
          {/* Blur gradient orb */}
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-[1220px] h-[543px] blur-gradient rounded-full -rotate-12 z-0" />

          <div className="max-w-7xl mx-auto relative z-10">
            {/* Badge */}
            <div className="flex justify-center mb-10" data-animation-on-scroll>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-accent/20 rounded-lg text-sm text-text-primary">
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
              </span>
            </div>

            {/* Headline */}
            <div
              className="max-w-4xl mx-auto text-center mb-16"
              data-animation-on-scroll
            >
              <h1 className="font-heading text-6xl md:text-7xl lg:text-8xl font-normal tracking-mega-tight leading-none mb-6">
                One-on-One Education{" "}
                <span className="italic text-brand-primary">
                  For Every Student
                </span>
              </h1>
              <p className="text-lg md:text-xl text-text-primary leading-relaxed max-w-2xl mx-auto mb-10">
                Lifelike AI avatars that educate the Socratic way. Real-time
                voice conversations, interactive math modules, and 100% adaptive
                curriculum.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-8 py-4 bg-text-primary text-white font-medium text-base rounded-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-0.5"
                >
                  Start your journey
                </Link>
                <a
                  href="#how-it-works"
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

            {/* Product Mockup */}
            <div className="max-w-5xl mx-auto" data-animation-on-scroll>
              <div className="bg-white/30 rounded-xl md:rounded-2xl p-2 md:p-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)]">
                <div className="aspect-video bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-lg md:rounded-xl overflow-hidden relative">
                  {/* Window chrome */}
                  <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="bg-gray-700 rounded px-4 py-1.5 text-[10px] md:text-xs text-gray-300 font-mono">
                      SESSION: Calculus Part 1 &bull; Socratic Method Active
                    </div>
                    <div className="text-brand-primary text-xs font-bold animate-pulse">
                      LIVE VOICE
                    </div>
                  </div>

                  {/* Content grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 h-full pb-12">
                    {/* Left: Avatar */}
                    <div className="relative overflow-hidden flex items-center justify-center bg-gray-900 border-r border-gray-700">
                      <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20" />
                      <div className="relative z-10 flex flex-col items-center gap-4">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-4xl shadow-lg">
                          🦉
                        </div>
                        <span className="text-white/60 text-xs font-medium">
                          AI Mentor Minerva
                        </span>
                      </div>
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

                    {/* Right: Canvas simulation */}
                    <div className="md:col-span-2 bg-gray-50 flex flex-col">
                      <div className="flex-1 p-4 relative overflow-hidden">
                        <div className="w-full h-full border border-gray-200 rounded-lg bg-white relative shadow-inner overflow-hidden">
                          {/* Canvas header */}
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

                          {/* Floating equation */}
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

                      {/* Mastery bar */}
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
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── THE SOCRATIC EDGE ─── */}
        <section
          className="py-24 bg-neutral-background px-6"
          id="how-it-works"
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16" data-animation-on-scroll>
              <p className="text-sm font-mono font-medium text-brand-primary uppercase tracking-wide mb-4">
                The Socratic Edge
              </p>
              <h2 className="font-heading text-4xl md:text-5xl font-normal tracking-tighter mb-4">
                She doesn&apos;t just give answers.
                <br />
                <span className="italic text-brand-primary">
                  She teaches how to think.
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <FeatureCard
                emoji="🤝"
                title="Patience of a Saint"
                description="Minerva never gets frustrated. She will rephrase, illustrate, and guide a student through a concept 100 times if that's what it takes to reach that 'Aha!' moment."
              />
              <FeatureCard
                emoji="❓"
                title="Masterful Inquiry"
                description="Powered by Claude 4.5, our AI uses the Socratic method to break down complex problems into manageable questions, building genuine understanding."
                delay="0.1s"
              />
              <FeatureCard
                emoji="🗣️"
                title="Natural Conversation"
                description="Latency-free voice via HeyGen ensures the flow of conversation feels human, making learning a social, engaging experience rather than a chore."
                delay="0.2s"
              />
            </div>

            {/* Chat simulation */}
            <div
              className="max-w-2xl mx-auto"
              data-animation-on-scroll
            >
              <div className="bg-neutral-surface rounded-2xl border border-border-light p-6 shadow-[0_20px_40px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-lg">
                    🦉
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-sm">
                      MINERVA
                    </p>
                    <p className="text-[10px] text-text-secondary">
                      Thinking...
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-brand-primary">
                    <p className="text-sm font-medium italic">
                      &ldquo;Great observation on the x-intercept! Now, if we
                      increase the constant &lsquo;c&rsquo;, which way do you
                      think the whole curve will shift?&rdquo;
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
        </section>

        {/* ─── INTERACTIVE CANVAS ─── */}
        <section className="py-24 bg-neutral-background px-6" id="canvas">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16" data-animation-on-scroll>
              <h2 className="font-heading text-4xl md:text-5xl font-normal tracking-tighter mb-4">
                Precision visualization tools.
              </h2>
              <p className="text-text-secondary max-w-2xl mx-auto">
                Minerva controls a live digital workspace. When she talks about
                a parabola, she draws it. When you manipulate a slider, she
                explains the change.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <CanvasCard
                emoji="📉"
                title="Desmos Integration"
                description="High-fidelity graphing for algebra, calculus, and trigonometry. See functions come to life instantly."
              />
              <CanvasCard
                emoji="📐"
                title="GeoGebra Constructions"
                description="Interactive geometry. Drag points, measure angles, and prove theorems in an environment that understands math."
                delay="0.1s"
              />
              <CanvasCard
                emoji="✍️"
                title="Dynamic Rendering"
                description="No static slides. Every visual is generated on-the-fly based on the student's specific struggle or question."
                delay="0.2s"
              />
            </div>
          </div>
        </section>

        {/* ─── PARENT PORTAL (dark) ─── */}
        <section
          className="py-24 bg-neutral-dark text-white rounded-[2rem] mx-4 md:mx-12 overflow-hidden"
          id="dashboard"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Session summary card */}
              <div className="order-2 lg:order-1" data-animation-on-scroll>
                <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="font-heading text-xl font-semibold">
                      Session Summary: Leo W.
                    </h4>
                    <span className="text-xs bg-brand-primary/20 text-brand-primary px-3 py-1 rounded-full border border-brand-primary/30">
                      February 24
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

              {/* Description */}
              <div className="order-1 lg:order-2" data-animation-on-scroll>
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
                  Stop wondering what&apos;s happening during education
                  sessions. Get deep, AI-driven insights into your child&apos;s
                  confidence, engagement, and actual mastery of subjects.
                </p>
                <ul className="space-y-4">
                  <CheckItem text="Set custom curriculum and goals (SAT, AP, State Exams)" />
                  <CheckItem text="Real-time alerts for persistence roadblocks" />
                  <CheckItem text="Weekly progress reports sent via WhatsApp/Email" />
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section className="py-24 bg-neutral-surface px-6" id="faq">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-heading text-3xl md:text-4xl text-center mb-12">
              Questions? We have answers.
            </h2>
            <div className="space-y-6">
              <FaqCard
                question='How "lifelike" is the avatar?'
                answer="Powered by HeyGen's streaming technology, Minerva blinks, expresses emotions, and syncs her speech perfectly to her voice. Students often forget they are talking to an AI within the first 5 minutes."
              />
              <FaqCard
                question="Can it help with competitive exams like SAT or AP?"
                answer="Yes. Our curriculum engine includes dedicated modules for SAT Math and multiple AP subjects (BC Calculus, Statistics, Physics), with practice problems from past exams."
              />
              <FaqCard
                question="What if my child gets stuck?"
                answer="Minerva is specifically tuned to recognize frustration. If a student is stuck, she will drop the Socratic method temporarily to offer a supportive hint or visualize the concepts in a different way on the canvas, ensuring the education process remains fluid."
              />
            </div>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="bg-neutral-surface pt-16 pb-8 border-t border-border-light">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="text-sm text-text-secondary">
              &copy; 2026 Minerva AI Education. Powered by Zoom, HeyGen, &amp;
              Claude.
            </p>
            <div className="flex gap-6">
              <a
                href="#"
                className="text-sm text-text-secondary hover:text-brand-primary transition-colors"
              >
                Privacy
              </a>
              <a
                href="#"
                className="text-sm text-text-secondary hover:text-brand-primary transition-colors"
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

/* ─── Sub-components ─── */

function FeatureCard({
  emoji,
  title,
  description,
  delay,
}: {
  emoji: string;
  title: string;
  description: string;
  delay?: string;
}) {
  return (
    <div
      className="bg-neutral-surface p-8 rounded-2xl border border-border-light hover:border-brand-primary transition-colors group"
      data-animation-on-scroll
      style={delay ? { transitionDelay: delay } : undefined}
    >
      <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">
        {emoji}
      </div>
      <h3 className="font-heading text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm text-text-secondary">{description}</p>
    </div>
  );
}

function CanvasCard({
  emoji,
  title,
  description,
  delay,
}: {
  emoji: string;
  title: string;
  description: string;
  delay?: string;
}) {
  return (
    <div
      className="bg-neutral-surface p-8 rounded-2xl border border-border-light hover:border-brand-primary transition-colors group"
      data-animation-on-scroll
      style={delay ? { transitionDelay: delay } : undefined}
    >
      <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">
        {emoji}
      </div>
      <h3 className="font-heading text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm text-text-secondary">{description}</p>
    </div>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3">
      <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-[10px] text-green-400 shrink-0">
        ✓
      </div>
      <span className="text-gray-300 text-sm">{text}</span>
    </li>
  );
}

function FaqCard({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <div
      className="bg-white p-6 rounded-xl border border-border-light"
      data-animation-on-scroll
    >
      <h4 className="font-bold text-text-primary mb-2">{question}</h4>
      <p className="text-sm text-text-secondary">{answer}</p>
    </div>
  );
}
