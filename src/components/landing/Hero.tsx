import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="hero-gradient pt-40 pb-16 px-6 relative overflow-hidden">
      {/* Blur gradient blob */}
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-[1220px] h-[543px] blur-gradient rounded-full -rotate-12 z-0" />

      <div className="max-w-7xl mx-auto relative z-10">

        {/* Hero heading */}
        <div className="max-w-4xl mx-auto text-center mb-16" data-aos>
          <h1 className="font-heading text-6xl md:text-7xl lg:text-8xl font-normal tracking-mega-tight leading-none mb-6">
            Every Child Deserves a{" "}
            <span className="italic text-brand-primary">
              brilliant, patient educator
            </span>
          </h1>
          <p className="text-lg md:text-xl text-text-primary leading-relaxed max-w-2xl mx-auto mb-10">
            Lifelike AI avatars that educate the Socratic way. Real-time voice
            conversations, interactive math modules, and 100% adaptive
            curriculum. Built with Zoom, HeyGen, Claude, and more!
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto px-8 py-4 h-auto bg-text-primary text-white hover:bg-text-primary/90 rounded-sm hover:shadow-soft hover:-translate-y-0.5 transition-all"
            >
              <Link href="/login">
                Start Free Trial
                <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 h-auto text-text-primary rounded-sm hover:bg-black/5"
            >
              <Link href="/login">
                Watch demo
                <PlayCircle className="size-5 ml-1" />
              </Link>
            </Button>
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
                  SESSION: Calculus Part 1 &bull; Socratic Method Active
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
  );
}
