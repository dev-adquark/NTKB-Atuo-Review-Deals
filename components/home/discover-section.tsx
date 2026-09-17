import Link from "next/link";
import { SectionHeading } from "./section-heading";
import { TiltCard } from "@/components/motion/tilt-card";

const CATEGORIES = [
  {
    title: "Mattress Reviews",
    description: "In-depth, independently written reviews of individual mattress models and brands.",
    href: "/us",
    gradient: "from-glow-a/30 to-transparent",
  },
  {
    title: "Compare Mattresses",
    description: "See how brands stack up on firmness, cooling, trial length, and warranty terms.",
    href: "#compare",
    gradient: "from-glow-b/30 to-transparent",
  },
  {
    title: "Top Picks & Deals",
    description: "Curated picks with verified affiliate offers — never a fabricated discount.",
    href: "/us/deals",
    gradient: "from-glow-c/30 to-transparent",
  },
];

export function DiscoverSection() {
  return (
    <section id="discover" className="mx-auto max-w-6xl px-4 py-20">
      <SectionHeading
        eyebrow="Discover"
        title="Everything you need to choose with confidence"
        description="Start wherever you are in the decision — from first research to picking the right deal for your region."
      />

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {CATEGORIES.map((category) => (
          <TiltCard key={category.title}>
            <Link
              href={category.href}
              className={`group relative block h-full overflow-hidden rounded-3xl border border-border-default bg-gradient-to-br ${category.gradient} bg-surface p-7`}
            >
              <h3 className="font-display text-xl font-medium text-foreground">{category.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">{category.description}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                Explore
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </span>
            </Link>
          </TiltCard>
        ))}
      </div>
    </section>
  );
}
