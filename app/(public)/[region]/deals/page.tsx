import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getRegionByPrefix } from "@/lib/render/public-page";
import { buildCanonicalUrl } from "@/lib/seo/canonical";
import { PAGE_TYPE_LABEL } from "@/lib/content/page-type-label";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/home/section-heading";
import { ReviewCard, type ReviewCardData } from "@/components/home/review-card";

export async function generateMetadata({ params }: PageProps<"/[region]/deals">): Promise<Metadata> {
  const { region: regionPrefix } = await params;
  const region = await getRegionByPrefix(regionPrefix);
  if (!region) return {};
  const canonical = buildCanonicalUrl(`/${region.urlPrefix}/deals`);
  const title = `Mattress Deals — ${region.name}`;
  const description = `Verified mattress top picks and deals for shoppers in ${region.name}.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

export default async function RegionDealsPage({ params }: PageProps<"/[region]/deals">) {
  const { region: regionPrefix } = await params;
  const region = await getRegionByPrefix(regionPrefix);
  if (!region) notFound();

  const pages = await prisma.generatedPage.findMany({
    where: { regionId: region.id, status: "PUBLISHED", isCurrent: true, pageType: "TOP_PICKS" },
    orderBy: { publishedAt: "desc" },
  });

  const cardData: ReviewCardData[] = pages.map((page) => ({
    id: page.id,
    title: page.title,
    description: page.metaDescription,
    canonicalPath: page.canonicalPath,
    regionCode: region.code,
    typeLabel: PAGE_TYPE_LABEL[page.pageType] ?? page.pageType,
  }));

  return (
    <div>
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 left-1/3 h-80 w-80 rounded-full bg-glow-c/20 blur-[100px]" />
        </div>
        <div className="mx-auto max-w-5xl px-4 py-16 text-center">
          <Reveal>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{region.code} Deals</span>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
              Mattress deals for {region.name}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              Only surfaced when a real, admin-verified affiliate offer exists — never an implied discount.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <SectionHeading eyebrow="Top Picks" title="Current deals" align="left" />

        {cardData.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cardData.map((page) => (
              <ReviewCard key={page.id} page={page} ctaLabel="View top picks" />
            ))}
          </div>
        ) : (
          <Reveal className="mt-8 rounded-3xl border border-dashed border-border-strong bg-surface p-10 text-center">
            <p className="text-sm text-muted">No verified deals are live for {region.name} right now. Check back soon.</p>
          </Reveal>
        )}
      </section>
    </div>
  );
}
