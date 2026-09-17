import type { Metadata } from "next";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { buildCanonicalUrl } from "@/lib/seo/canonical";
import { buildWebsiteJsonLd } from "@/lib/seo/jsonld";
import { Hero } from "@/components/home/hero";
import { DiscoverSection } from "@/components/home/discover-section";
import { FeaturedReviews } from "@/components/home/featured-reviews";
import { CompareSection } from "@/components/home/compare-section";
import { RegionalDiscovery } from "@/components/home/regional-discovery";
import { DealsSection } from "@/components/home/deals-section";
import { WhyNtkb } from "@/components/home/why-ntkb";
import { FaqSection } from "@/components/home/faq-section";
import { FinalCta } from "@/components/home/final-cta";
import type { ReviewCardData } from "@/components/home/review-card";
import { PAGE_TYPE_LABEL } from "@/lib/content/page-type-label";

const SITE_NAME = "NTKB Auto Review Deals";
const SITE_DESCRIPTION =
  "Independent, region-aware mattress reviews and top picks — with clear affiliate disclosure on every monetized page.";

export async function generateMetadata(): Promise<Metadata> {
  const canonical = buildCanonicalUrl("/");
  return {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    alternates: { canonical },
    openGraph: { title: SITE_NAME, description: SITE_DESCRIPTION, url: canonical, type: "website" },
    twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESCRIPTION },
  };
}

export default async function HomePage() {
  // The homepage reflects database-backed publishing state, so render it only
  // after a request arrives instead of querying during a deployment build.
  await connection();

  const [regions, reviewPages, dealPages] = await Promise.all([
    prisma.region.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    prisma.generatedPage.findMany({
      where: { status: "PUBLISHED", isCurrent: true, pageType: { in: ["KEYWORD_REVIEW", "BRAND_REVIEW"] } },
      orderBy: { publishedAt: "desc" },
      take: 6,
      include: { region: true },
    }),
    prisma.generatedPage.findMany({
      where: { status: "PUBLISHED", isCurrent: true, pageType: "TOP_PICKS" },
      orderBy: { publishedAt: "desc" },
      take: 3,
      include: { region: true },
    }),
  ]);

  const toCardData = (page: (typeof reviewPages)[number]): ReviewCardData => ({
    id: page.id,
    title: page.title,
    description: page.metaDescription,
    canonicalPath: page.canonicalPath,
    regionCode: page.region.code,
    typeLabel: PAGE_TYPE_LABEL[page.pageType] ?? page.pageType,
  });

  const websiteJsonLd = buildWebsiteJsonLd({ name: SITE_NAME, url: buildCanonicalUrl("/") });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />

      <Hero />
      <DiscoverSection />
      <FeaturedReviews pages={reviewPages.map(toCardData)} />
      <CompareSection />
      <RegionalDiscovery regions={regions} />
      <DealsSection pages={dealPages.map(toCardData)} />
      <WhyNtkb />
      <FaqSection />
      <FinalCta />
    </>
  );
}
