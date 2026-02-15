import { Quote } from "lucide-react";
import { stats, testimonials } from "./data";

export function SocialProof() {
  return (
    <section className="py-24 bg-neutral-surface px-6">
      <div className="max-w-7xl mx-auto">
        {/* Stats row */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20"
          data-aos
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-heading text-4xl md:text-5xl font-semibold text-brand-primary mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-text-secondary">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="text-center mb-12" data-aos>
          <h2 className="font-heading text-3xl md:text-4xl font-normal tracking-tighter">
            Loved by students, parents, and educators.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className="bg-white rounded-2xl border border-border-light p-6 shadow-soft"
              data-aos
              style={i > 0 ? { transitionDelay: `${i * 0.1}s` } : undefined}
            >
              <Quote className="size-8 text-brand-primary/30 mb-4" />
              <p className="text-text-secondary leading-relaxed mb-6 text-sm">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-sm font-bold text-brand-primary">
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-primary">
                    {t.name}
                  </div>
                  <div className="text-xs text-text-secondary">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
