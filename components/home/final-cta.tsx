import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <Reveal className="relative overflow-hidden rounded-[2rem] border border-border-default bg-gradient-to-br from-primary via-primary to-accent px-8 py-16 text-center sm:px-16">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_60%)]" />
        <h2 className="relative font-display text-3xl font-medium tracking-tight text-primary-foreground sm:text-4xl">
          Find the mattress that actually fits how you sleep.
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-primary-foreground/80">
          Browse region-specific reviews and verified deals — no fabricated claims, no fine-print surprises.
        </p>
        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/us"
            className="inline-flex items-center gap-2 rounded-full bg-background px-6 py-3 text-sm font-medium text-foreground transition-transform hover:-translate-y-0.5"
          >
            Start With US Reviews
          </Link>
          <Link
            href="#regions"
            className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/40 px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/10"
          >
            Pick Your Region
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
