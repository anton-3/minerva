import { socraticFeatures } from "./data";

export function SocraticEdge() {
  return (
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
              {socraticFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="flex gap-4">
                    <div className="w-12 h-12 bg-white rounded-lg shadow-soft flex items-center justify-center shrink-0">
                      <Icon className="size-6 text-brand-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading text-xl font-semibold mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-text-secondary leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: chat mockup */}
          <div className="relative" data-aos>
            <div className="aspect-square gradient-peach rounded-2xl p-8 flex items-center justify-center">
              <div className="bg-white rounded-xl shadow-medium p-4 w-full space-y-4">
                {/* Chat header */}
                <div className="flex items-center gap-3 border-b border-border-light pb-3">
                  <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/minerva-logo.png" alt="" className="h-6 w-6" />
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
        </div>
      </div>
    </section>
  );
}
