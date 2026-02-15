import { canvasFeatures } from "./data";

export function CanvasFeatures() {
  return (
    <section className="py-24 bg-neutral-background px-6" id="canvas">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16" data-aos>
          <h2 className="font-heading text-4xl md:text-5xl font-normal tracking-tighter mb-4">
            Precision visualization tools.
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Minerva controls a live digital workspace. When she talks about a
            parabola, she draws it. When you manipulate a slider, she explains
            the change.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {canvasFeatures.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-neutral-surface p-8 rounded-2xl border border-border-light hover:border-brand-primary transition-colors group"
                data-aos
                style={i > 0 ? { transitionDelay: `${i * 0.1}s` } : undefined}
              >
                <div className="w-12 h-12 bg-white rounded-lg shadow-soft flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="size-6 text-brand-primary" />
                </div>
                <h3 className="font-heading text-xl font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-text-secondary">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
