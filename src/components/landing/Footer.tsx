import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { footerProductLinks, footerTechBadges } from "./data";

export function Footer() {
  return (
    <>
      {/* Final CTA section */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center" data-aos>
          <h2 className="font-heading text-4xl md:text-5xl font-normal tracking-tighter mb-4">
            Ready to transform how your child{" "}
            <span className="italic text-brand-primary">learns?</span>
          </h2>
          <p className="text-text-secondary text-lg mb-8 max-w-xl mx-auto">
            Join thousands of families who are giving their children access to
            a world-class, patient, always-available AI tutor.
          </p>
          <Button
            asChild
            size="lg"
            className="px-8 py-4 h-auto bg-text-primary text-white hover:bg-text-primary/90 rounded-sm hover:shadow-soft hover:-translate-y-0.5 transition-all"
          >
            <Link href="/login">
              Start Free Trial
              <ArrowRight className="size-4 ml-1" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-surface pt-16 pb-8 border-t border-border-light">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            {/* Brand */}
            <div>
              <div className="text-xl font-heading font-semibold text-text-primary flex items-center gap-2 mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/minerva-logo.png" alt="" className="h-8 w-8" />
                Minerva AI
              </div>
              <p className="text-sm text-text-secondary">
                The AI tutor that teaches how to think, not just what to
                answer.
              </p>
            </div>

            {/* Product links */}
            <div>
              <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">
                Product
              </div>
              <ul className="space-y-2">
                {footerProductLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-sm text-text-secondary hover:text-brand-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Built with */}
            <div>
              <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">
                Built With
              </div>
              <div className="flex flex-wrap gap-2">
                {footerTechBadges.map((badge) => (
                  <span
                    key={badge}
                    className="px-3 py-1 bg-white rounded-full text-xs font-medium text-text-secondary border border-border-light"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-border-light flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-text-secondary">
              &copy; 2026 Minerva AI Education. Built at{" "}
              <span className="font-medium text-text-primary">
                TreeHacks 2026
              </span>
              .
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
    </>
  );
}
