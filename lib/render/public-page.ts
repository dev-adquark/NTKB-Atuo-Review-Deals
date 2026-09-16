import "server-only";
import { prisma } from "@/lib/db";
import type { PageType } from "@/app/generated/prisma/client";

/** Fetches the single currently-published version of a page. Drafts are never reachable here. */
export async function getPublishedPage(where: { regionId: string; pageType: PageType; slug: string }) {
  return prisma.generatedPage.findFirst({
    where: { ...where, status: "PUBLISHED", isCurrent: true },
    include: { region: true, keyword: true, brand: true },
  });
}

export async function getRegionByPrefix(urlPrefix: string) {
  return prisma.region.findFirst({ where: { urlPrefix, active: true } });
}
