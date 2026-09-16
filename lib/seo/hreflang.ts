import "server-only";
import { prisma } from "@/lib/db";
import type { PageType } from "@/app/generated/prisma/client";
import { buildCanonicalUrl } from "./canonical";

/**
 * Finds the published counterpart pages for the same content across other regions and
 * returns a { hreflang: url } map. Only regions that are actually configured and have a
 * published page are included (spec section 25) — never a guessed/invalid hreflang.
 */
export async function getHreflangAlternates(params: {
  pageType: PageType;
  selfPageId: string;
  brandId?: string | null;
  keywordText?: string | null;
}): Promise<Record<string, string>> {
  const { pageType, selfPageId, brandId, keywordText } = params;

  if (pageType === "BRAND_REVIEW" && brandId) {
    const pages = await prisma.generatedPage.findMany({
      where: { pageType, brandId, isCurrent: true, status: "PUBLISHED", id: { not: selfPageId } },
      include: { region: true },
    });
    return toAlternates(pages);
  }

  if (keywordText) {
    const siblingKeywords = await prisma.keyword.findMany({
      where: { text: { equals: keywordText, mode: "insensitive" }, pageType },
      select: { id: true },
    });
    const keywordIds = siblingKeywords.map((k) => k.id);
    if (keywordIds.length === 0) return {};

    const pages = await prisma.generatedPage.findMany({
      where: {
        pageType,
        keywordId: { in: keywordIds },
        isCurrent: true,
        status: "PUBLISHED",
        id: { not: selfPageId },
      },
      include: { region: true },
    });
    return toAlternates(pages);
  }

  return {};
}

function toAlternates(pages: Array<{ canonicalPath: string; region: { language: string } }>): Record<string, string> {
  const alternates: Record<string, string> = {};
  for (const page of pages) {
    alternates[page.region.language] = buildCanonicalUrl(page.canonicalPath);
  }
  return alternates;
}
