import { SectionHeading } from "./section-heading";
import { Reveal } from "@/components/motion/reveal";

const REASONS = [
  {
    title: "Never fabricated",
    detail: "Prices, deals, and claims come from real admin-configured mappings and validated content — nothing invented.",
  },
  {
    title: "Disclosed, always",
    detail: "Every sponsored or affiliate-driven page carries a clear, visible disclosure — no hidden monetization.",
  },
  {
    title: "Validated before publish",
    detail: "Pages pass a required-content and uniqueness check before they ever go live, and drafts stay unindexed.",
  },
  {
    title: "Region-aware by design",
    detail: "US and EU each get their own pricing, warranty, and affiliate context — not a single global list.",
  },
];

export function WhyNtkb() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <SectionHeading eyebrow="Why NTKB" title="Trust is the actual product" align="left" />

      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2">
        {REASONS.map((reason, i) => (
          <Reveal key={reason.title} delay={i * 0.05} className="flex gap-4">
            <span aria-hidden className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
            <div>
              <h3 className="font-display text-lg font-medium text-foreground">{reason.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{reason.detail}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
