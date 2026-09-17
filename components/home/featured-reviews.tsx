import Link from "next/link";
import { SectionHeading } from "./section-heading";
import { ReviewCard, type ReviewCardData } from "./review-card";
import { Reveal } from "@/components/motion/reveal";

export function FeaturedReviews({ pages }: { pages: ReviewCardData[] }) {
  return (
    <section id="reviews" className="mx-auto max-w-6xl px-4 py-20">
      <SectionHeading
        eyebrow="Featured"
        title="Recently published reviews"
        description="Every review runs through the same validation pipeline — required sections, factual claim checks, and a uniqueness gate — before it ever goes live."
      />

      {pages.length > 0 ? (
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <ReviewCard key={page.id} page={page} />
          ))}
        </div>
      ) : (
        <Reveal className="mt-12 rounded-3xl border border-dashed border-border-strong bg-surface p-10 text-center">
          <p className="text-sm text-muted">
            No reviews have published yet for this view. Check back soon, or{" "}
            <Link href="/search" className="font-medium text-primary underline underline-offset-2">
              search what&apos;s live now
            </Link>
            .
          </p>
        </Reveal>
      )}
    </section>
  );
}
