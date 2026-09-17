import Link from "next/link";
import { TiltCard } from "@/components/motion/tilt-card";

const REGION_STYLE: Record<string, { gradient: string; blurb: string }> = {
  US: { gradient: "from-glow-a/40 via-transparent to-transparent", blurb: "Fast shipping, easy returns" },
  EU: { gradient: "from-glow-b/40 via-transparent to-transparent", blurb: "GDPR-aware, VAT-inclusive pricing" },
};

export function RegionCard({ code, name, href }: { code: string; name: string; href: string }) {
  const style = REGION_STYLE[code] ?? REGION_STYLE.US;
  return (
    <TiltCard>
      <Link
        href={href}
        className={`group relative block overflow-hidden rounded-3xl border border-border-default bg-gradient-to-br ${style.gradient} bg-surface p-6`}
      >
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{code}</span>
        <h3 className="mt-2 font-display text-xl font-medium text-foreground">{name}</h3>
        <p className="mt-1.5 text-sm text-muted">{style.blurb}</p>
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
          Browse {code}
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </Link>
    </TiltCard>
  );
}
