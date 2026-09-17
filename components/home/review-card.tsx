import Link from "next/link";
import { TiltCard } from "@/components/motion/tilt-card";

export interface ReviewCardData {
  id: string;
  title: string;
  description: string;
  canonicalPath: string;
  regionCode: string;
  typeLabel: string;
}

export function ReviewCard({ page, ctaLabel = "Read review" }: { page: ReviewCardData; ctaLabel?: string }) {
  return (
    <TiltCard className="h-full">
      <Link
        href={page.canonicalPath}
        className="group flex h-full flex-col rounded-3xl border border-border-default bg-surface p-6 shadow-[0_1px_0_0_rgba(0,0,0,0.02)] transition-shadow hover:shadow-[0_30px_60px_-25px_rgba(15,23,42,0.25)]"
      >
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{page.typeLabel}</span>
          <span className="text-xs font-medium tracking-wide text-muted">{page.regionCode}</span>
        </div>

        <MiniMattressGlyph />

        <h3 className="mt-4 font-display text-lg font-medium leading-snug text-foreground">{page.title}</h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted">{page.description}</p>

        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
          {ctaLabel}
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </Link>
    </TiltCard>
  );
}

function MiniMattressGlyph() {
  return (
    <div className="mt-4 flex gap-1" aria-hidden>
      <span className="h-2 flex-1 rounded-full bg-gradient-to-r from-glow-a/70 to-glow-a/20" />
      <span className="h-2 flex-1 rounded-full bg-gradient-to-r from-glow-b/70 to-glow-b/20" />
      <span className="h-2 flex-1 rounded-full bg-gradient-to-r from-glow-c/70 to-glow-c/20" />
    </div>
  );
}
