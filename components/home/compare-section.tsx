import { SectionHeading } from "./section-heading";
import { Reveal } from "@/components/motion/reveal";

const CRITERIA = [
  { label: "Performance & specs", detail: "Real-world benchmarks and everyday use, not just numbers on a spec sheet." },
  { label: "Build & design", detail: "Materials, construction quality, and how well it holds up over time." },
  { label: "Battery & reliability", detail: "Real-world battery life and long-term dependability, where applicable." },
  { label: "Warranty coverage", detail: "Years of coverage and what's actually included versus excluded." },
  { label: "Shipping & availability", detail: "Realistic delivery timelines and regional availability." },
  { label: "Verified pricing", detail: "Only current, source-checked pricing — never an invented discount." },
];

export function CompareSection() {
  return (
    <section id="compare" className="bg-surface py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Compare"
          title="What actually separates one product from another"
          description="Every review scores the same criteria, so comparisons stay consistent no matter which brands you're weighing."
        />

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CRITERIA.map((c, i) => (
            <Reveal key={c.label} delay={i * 0.05}>
              <div className="h-full rounded-2xl border border-border-default bg-background p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 font-display text-base font-medium text-foreground">{c.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{c.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
