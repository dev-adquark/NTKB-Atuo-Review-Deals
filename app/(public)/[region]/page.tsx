import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getRegionByPrefix } from "@/lib/render/public-page";
import { buildCanonicalUrl } from "@/lib/seo/canonical";
import { PAGE_TYPE_LABEL } from "@/lib/content/page-type-label";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/home/section-heading";
import { ReviewCard, type ReviewCardData } from "@/components/home/review-card";
import { TiltCard } from "@/components/motion/tilt-card";

export async function generateMetadata({ params }: PageProps<"/[region]">): Promise<Metadata> {
  const { region: regionPrefix } = await params;
  const region = await getRegionByPrefix(regionPrefix);
  if (!region) return {};
  const canonical = buildCanonicalUrl(`/${region.urlPrefix}`);
  const title = `${region.name} — NTKB Auto Review Deals`;
  const description = `Tech, electronics, and fashion reviews and top picks for shoppers in ${region.name}.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

export default async function RegionHubPage({ params }: PageProps<"/[region]">) {
  const { region: regionPrefix } = await params;
  const region = await getRegionByPrefix(regionPrefix);
  if (!region) notFound();

  const [rankings, pages, brandReviewPages] = await Promise.all([
    prisma.brandRanking.findMany({ where: { regionId: region.id }, include: { brand: true }, orderBy: { rank: "asc" } }),
    prisma.generatedPage.findMany({
      where: { regionId: region.id, status: "PUBLISHED", isCurrent: true },
      orderBy: { publishedAt: "desc" },
      take: 30,
    }),
    // A brand ranking is admin-configured independently of whether its review
    // page has actually been generated and published yet — only link a rank
    // card to a brand that has a real, live page behind it (never a dead link).
    prisma.generatedPage.findMany({
      where: { regionId: region.id, pageType: "BRAND_REVIEW", status: "PUBLISHED", isCurrent: true },
      select: { brandId: true, canonicalPath: true },
    }),
  ]);
  const publishedBrandPath = new Map(brandReviewPages.map((p) => [p.brandId, p.canonicalPath]));
  const rankedBrandsWithPages = rankings.filter((r) => publishedBrandPath.has(r.brandId));

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
          <div className="absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-glow-a/20 blur-[100px]" />
          <div className="absolute -top-10 right-1/4 h-72 w-72 rounded-full bg-glow-b/15 blur-[100px]" />
        </div>
        <div className="mx-auto max-w-5xl px-4 py-16 text-center">
          <Reveal>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{region.code} Region</span>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
              Reviews for {region.name}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              Pricing, warranty terms, and shipping guidance mapped specifically to {region.name} shoppers.
            </p>
          </Reveal>
        </div>
      </section>

      {rankedBrandsWithPages.length > 0 ? (
        <section className="mx-auto max-w-5xl px-4 py-14">
          <SectionHeading eyebrow="Ranked" title="Top brands in this region" align="left" />
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {rankedBrandsWithPages.map((r) => (
              <TiltCard key={r.id}>
                <Link
                  href={publishedBrandPath.get(r.brandId)!}
                  className="group flex items-center gap-4 rounded-2xl border border-border-default bg-surface p-5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-medium text-primary">
                    #{r.rank}
                  </span>
                  <span className="font-display text-base font-medium text-foreground">{r.brand.name}</span>
                  <span aria-hidden className="ml-auto text-muted transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              </TiltCard>
            ))}
          </div>
        </section>
      ) : null}

      <section className="bg-surface py-14">
        <div className="mx-auto max-w-5xl px-4">
          <SectionHeading eyebrow="Latest" title="Reviews & top picks" align="left" />

          {cardData.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cardData.map((page) => (
                <ReviewCard key={page.id} page={page} />
              ))}
            </div>
          ) : (
            <Reveal className="mt-8 rounded-3xl border border-dashed border-border-strong bg-background p-10 text-center">
              <p className="text-sm text-muted">No published pages yet for {region.name}. Check back soon.</p>
            </Reveal>
          )}
        </div>
      </section>
    </div>
  );
}
