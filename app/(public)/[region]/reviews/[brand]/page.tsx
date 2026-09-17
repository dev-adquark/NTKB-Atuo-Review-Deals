import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getPublishedPage, getRegionByPrefix } from "@/lib/render/public-page";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { GeneratedPageView } from "@/components/content/generated-page-view";

// generateMetadata and the page component both need this lookup — cache() dedupes
// the two DB round trips into one per request instead of doubling them.
const loadPage = cache(async (regionPrefix: string, brandSlug: string) => {
  const region = await getRegionByPrefix(regionPrefix);
  if (!region) return null;
  return getPublishedPage({ regionId: region.id, pageType: "BRAND_REVIEW", slug: brandSlug });
});

export async function generateMetadata({ params }: PageProps<"/[region]/reviews/[brand]">): Promise<Metadata> {
  const { region, brand } = await params;
  const page = await loadPage(region, brand);
  if (!page) return {};
  return buildPageMetadata(page);
}

export default async function BrandReviewPage({ params }: PageProps<"/[region]/reviews/[brand]">) {
  const { region, brand } = await params;
  const page = await loadPage(region, brand);
  if (!page) notFound();
  return <GeneratedPageView page={page} />;
}
