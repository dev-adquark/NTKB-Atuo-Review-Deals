import { SectionHeading } from "./section-heading";
import { ReviewCard, type ReviewCardData } from "./review-card";
import { Reveal } from "@/components/motion/reveal";

export function DealsSection({ pages }: { pages: ReviewCardData[] }) {
  return (
    <section id="deals" className="bg-surface py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Deals"
          title="Top picks with a verified current offer"
          description="We only surface a deal when there's a real, admin-verified affiliate mapping behind it — never an implied discount that isn't there."
        />

        {pages.length > 0 ? (
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => (
              <ReviewCard key={page.id} page={page} ctaLabel="View top picks" />
            ))}
          </div>
        ) : (
          <Reveal className="mt-12 rounded-3xl border border-dashed border-border-strong bg-background p-10 text-center">
            <p className="text-sm text-muted">No verified deals are live for this view right now — check back soon.</p>
          </Reveal>
        )}
      </div>
    </section>
  );
}
