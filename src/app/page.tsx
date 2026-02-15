// Minerva Landing Page
// See: specs/001-minerva-mvp/tasks.md (T062)

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">M</span>
          </div>
          <span className="font-display font-semibold text-lg">Minerva</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block rounded-full bg-[#A78BFA]/10 border border-[#A78BFA]/20 px-3 py-1 text-xs font-medium text-[#A78BFA] mb-6">
          Built at TreeHacks 2026
        </div>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white max-w-3xl mx-auto leading-tight">
          Every child deserves a{" "}
          <span className="text-[#A78BFA]">brilliant, patient tutor</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Minerva is an AI-powered avatar tutor that teaches any subject through
          real-time conversation and interactive visuals. Math, physics,
          history, chemistry, life skills — with adaptive learning, file upload,
          and session summaries for parents.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Start Learning
          </Link>
          <a
            href="#how-it-works"
            className="rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground hover:bg-muted/50 transition-colors"
          >
            See How It Works
          </a>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-display text-3xl font-bold text-center mb-12">
          How Minerva Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            step="1"
            title="Parent Sets Goals"
            description="Create a profile for your child and set learning goals. Minerva generates a personalized curriculum powered by AI."
          />
          <FeatureCard
            step="2"
            title="Child Learns with Avatar"
            description="Your child speaks with a patient AI tutor face-to-face. Interactive visuals, graphs, simulations, and diagrams appear in real time for any subject."
          />
          <FeatureCard
            step="3"
            title="Track Progress"
            description="After each session, get an AI-generated summary with engagement and comprehension scores. Watch your child's mastery grow over time."
          />
        </div>
      </section>

      {/* Value Props */}
      <section className="bg-[#0E0C18] border-y border-[#A78BFA]/10">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="font-display text-3xl font-bold text-center mb-12">
            Why Minerva?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <ValueProp
              title="Infinite Patience"
              description="Never frustrated, never rushed. Explains concepts as many times as needed."
            />
            <ValueProp
              title="Any Subject"
              description="Math, physics, chemistry, history, biology, economics, music, life skills — Minerva teaches it all with interactive visuals."
            />
            <ValueProp
              title="Socratic Method"
              description="Guides students to discover answers through thoughtful questions, not just telling."
            />
            <ValueProp
              title="Affordable"
              description="Great tutoring shouldn't cost $40-100/hour. Minerva makes it accessible to every family."
            />
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-display text-3xl font-bold text-center mb-4">
          Powered By
        </h2>
        <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
          Built with cutting-edge AI and video technology
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
          <TechBadge name="Claude" detail="Tutor Brain" />
          <TechBadge name="HeyGen" detail="Avatar" />
          <TechBadge name="Perplexity Sonar" detail="Knowledge" />
          <TechBadge name="Desmos + GeoGebra" detail="Math Canvas" />
          <TechBadge name="Zoom Video SDK" detail="Call Framework" />
          <TechBadge name="Supabase" detail="Database" />
          <TechBadge name="Next.js" detail="Framework" />
          <TechBadge name="Vercel" detail="Deployment" />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="bg-[#A78BFA]/5 border border-[#A78BFA]/20 rounded-2xl p-12">
          <h2 className="font-display text-3xl font-bold mb-4">
            Ready to transform learning?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Give your child a tutor that never gives up, always explains
            clearly, and makes learning genuinely fun.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-primary px-8 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">M</span>
            </div>
            <span className="text-sm font-medium">Minerva</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Built with care at TreeHacks 2026. Every child deserves a great teacher.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-[#A78BFA]/10 bg-[#141414] p-6 text-center hover:border-[#A78BFA]/30 transition-colors">
      <div className="mx-auto mb-4 w-10 h-10 rounded-full bg-[#A78BFA]/10 flex items-center justify-center">
        <span className="text-[#A78BFA] font-bold">{step}</span>
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function ValueProp({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-4">
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function TechBadge({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg bg-[#1A1A1A] border border-white/5">
      <span className="font-medium text-[#A78BFA]">{name}</span>
      <span className="text-xs text-white/50">{detail}</span>
    </div>
  );
}
