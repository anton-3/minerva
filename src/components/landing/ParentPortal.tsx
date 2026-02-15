import { Check } from "lucide-react";
import { parentChecklist } from "./data";

export function ParentPortal() {
  return (
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
                  &ldquo;Leo initially struggled with the concept of limits as
                  they approach infinity. Through our conversation, he correctly
                  identified that the vertical asymptote occurs when the
                  denominator is zero. He is ready to move on to
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
              <span className="italic text-brand-secondary">breakthrough.</span>
            </h2>
            <p className="text-lg text-gray-300 mb-8 leading-relaxed">
              Stop wondering what&apos;s happening during education sessions.
              Get deep, AI-driven insights into your child&apos;s confidence,
              engagement, and actual mastery of subjects.
            </p>
            <ul className="space-y-4">
              {parentChecklist.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="size-3 text-green-400" />
                  </div>
                  <span className="text-gray-300 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
