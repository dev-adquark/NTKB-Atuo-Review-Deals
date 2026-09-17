import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import type { PageType } from "@/app/generated/prisma/client";

/**
 * Fetches the single currently-published version of a page. Drafts are never
 * reachable here. Wrapped in React's cache() so generateMetadata and the page
 * component — which both need the same lookup — share one DB round trip per
 * request instead of each triggering their own.
 */
export const getPublishedPage = cache(async (where: { regionId: string; pageType: PageType; slug: string }) => {
  return prisma.generatedPage.findFirst({
    where: { ...where, status: "PUBLISHED", isCurrent: true },
    include: { region: true, keyword: true, brand: true },
  });
});

export const getRegionByPrefix = cache(async (urlPrefix: string) => {
  return prisma.region.findFirst({ where: { urlPrefix, active: true } });
});
