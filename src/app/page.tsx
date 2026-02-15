"use client";

import { useEffect, useRef } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { SocraticEdge } from "@/components/landing/SocraticEdge";
import { CanvasFeatures } from "@/components/landing/CanvasFeatures";
import { SocialProof } from "@/components/landing/SocialProof";
import { ParentPortal } from "@/components/landing/ParentPortal";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";
import { AvatarOverlay } from "@/components/shared/AvatarOverlay";

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
    <div
      ref={mainRef}
      className="font-primary bg-neutral-background text-text-primary overflow-x-hidden"
    >
      <Navbar />
      <main>
        <Hero />
        <SocraticEdge />
        <CanvasFeatures />
        <SocialProof />
        <ParentPortal />
        <FAQ />
      </main>
      <Footer />
      
      {/* Avatar overlay - triggered by 'M' key */}
      <AvatarOverlay />
    </div>
  );
}
