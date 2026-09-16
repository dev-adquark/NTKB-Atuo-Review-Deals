import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPage, getRegionByPrefix } from "@/lib/render/public-page";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { GeneratedPageView } from "@/components/content/generated-page-view";

async function loadPage(regionPrefix: string, slug: string) {
  const region = await getRegionByPrefix(regionPrefix);
  if (!region) return null;
  return getPublishedPage({ regionId: region.id, pageType: "TOP_PICKS", slug });
}

export async function generateMetadata({ params }: PageProps<"/[region]/deals/[slug]">): Promise<Metadata> {
  const { region, slug } = await params;
  const page = await loadPage(region, slug);
  if (!page) return {};
  return buildPageMetadata(page);
}

export default async function DealsRoundupPage({ params }: PageProps<"/[region]/deals/[slug]">) {
  const { region, slug } = await params;
  const page = await loadPage(region, slug);
  if (!page) notFound();
  return <GeneratedPageView page={page} />;
}
