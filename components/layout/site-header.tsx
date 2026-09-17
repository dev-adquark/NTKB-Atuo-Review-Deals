"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const NAV_LINKS = [
  { label: "Reviews", href: "/us" },
  { label: "Deals", href: "/us/deals" },
  { label: "Regions", href: "/#regions" },
  { label: "FAQ", href: "/#faq" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "border-border-default bg-surface/80 py-2.5 shadow-sm backdrop-blur-md"
          : "border-transparent bg-transparent py-4"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight text-foreground">
          NTKB<span className="text-primary">.</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-muted transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <Link
            href="/us/deals"
            className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Explore Deals
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-full border border-border-default"
          >
            <span
              aria-hidden
              className={`h-px w-4 bg-foreground transition-transform ${mobileOpen ? "translate-y-[3px] rotate-45" : ""}`}
            />
            <span
              aria-hidden
              className={`h-px w-4 bg-foreground transition-transform ${mobileOpen ? "-translate-y-[3px] -rotate-45" : ""}`}
            />
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <motion.nav
          initial={reduce ? undefined : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          aria-label="Mobile"
          className="mx-4 mt-3 flex flex-col gap-1 rounded-2xl border border-border-default bg-surface p-2 shadow-lg md:hidden"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-medium text-foreground hover:bg-surface-raised"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/us/deals"
            onClick={() => setMobileOpen(false)}
            className="mt-1 rounded-xl bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground"
          >
            Explore Deals
          </Link>
        </motion.nav>
      ) : null}
    </header>
  );
}
