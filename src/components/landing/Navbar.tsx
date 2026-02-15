"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: "How It Works", href: "#how-it-works" },
    { label: "Interactive Canvas", href: "#canvas" },
    { label: "Parent Portal", href: "#dashboard" },
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 py-3 bg-neutral-background/64 backdrop-blur-[10px] border-b border-black/12">
      <nav className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-heading font-semibold text-text-primary flex items-center gap-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/minerva-logo.png" alt="" className="h-8 w-8" /> Minerva AI
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-4 py-2 text-sm font-medium text-text-primary rounded-md hover:bg-black/5 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button
            asChild
            className="hidden md:inline-flex bg-text-primary text-white hover:bg-text-primary/90 rounded-sm"
          >
            <Link href="/login">Start Learning</Link>
          </Button>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-black/5 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden bg-neutral-background/95 backdrop-blur-md border-t border-black/8 px-6 py-4 space-y-2">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-3 text-sm font-medium text-text-primary rounded-md hover:bg-black/5 transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Button
            asChild
            className="w-full mt-2 bg-text-primary text-white hover:bg-text-primary/90 rounded-sm"
          >
            <Link href="/login">Start Learning</Link>
          </Button>
        </div>
      )}
    </header>
  );
}
