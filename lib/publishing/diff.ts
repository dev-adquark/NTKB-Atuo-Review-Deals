import "server-only";
import { prisma } from "@/lib/db";
import type { PageType } from "@/app/generated/prisma/client";
import type { StoredPageContent, StoredSeo } from "./types";

export interface FieldDiff {
  field: string;
  previous: string;
  current: string;
  changed: boolean;
}

export interface PageDiff {
  previousVersion: number;
  currentVersion: number;
  fields: FieldDiff[];
  sectionsChanged: boolean;
  affiliateChanged: boolean;
}

function field(name: string, previous: string, current: string): FieldDiff {
  return { field: name, previous, current, changed: previous !== current };
}

/** Finds the immediately preceding version of the same page (same region/type/keyword/brand slot). */
export async function getPreviousVersion(page: {
  id: string;
  regionId: string;
  pageType: PageType;
  keywordId: string | null;
  brandId: string | null;
  version: number;
}) {
  return prisma.generatedPage.findFirst({
    where: {
      regionId: page.regionId,
      pageType: page.pageType,
      keywordId: page.keywordId,
      brandId: page.brandId,
      version: { lt: page.version },
      id: { not: page.id },
    },
    orderBy: { version: "desc" },
  });
}

export function buildPageDiff(
  previous: { version: number; title: string; metaDescription: string; canonicalPath: string; content: unknown; seo: unknown },
  current: { version: number; title: string; metaDescription: string; canonicalPath: string; content: unknown; seo: unknown },
): PageDiff {
  const prevContent = previous.content as unknown as StoredPageContent;
  const curContent = current.content as unknown as StoredPageContent;
  const prevSeo = previous.seo as unknown as StoredSeo;
  const curSeo = current.seo as unknown as StoredSeo;

  const fields: FieldDiff[] = [
    field("Title", previous.title, current.title),
    field("Meta description", previous.metaDescription, current.metaDescription),
    field("Canonical path", previous.canonicalPath, current.canonicalPath),
    field("SEO title", prevSeo?.title ?? "", curSeo?.title ?? ""),
    field("SEO description", prevSeo?.description ?? "", curSeo?.description ?? ""),
    field(
      "Affiliate URL (brand review)",
      prevContent?.brand?.affiliateUrl ?? "",
      curContent?.brand?.affiliateUrl ?? "",
    ),
  ];

  const prevSections = JSON.stringify(prevContent?.generated?.content?.sections ?? []);
  const curSections = JSON.stringify(curContent?.generated?.content?.sections ?? []);

  const prevPicks = JSON.stringify(prevContent?.picks ?? []);
  const curPicks = JSON.stringify(curContent?.picks ?? []);

  return {
    previousVersion: previous.version,
    currentVersion: current.version,
    fields,
    sectionsChanged: prevSections !== curSections,
    affiliateChanged: field("brand", prevContent?.brand?.affiliateUrl ?? "", curContent?.brand?.affiliateUrl ?? "").changed || prevPicks !== curPicks,
  };
}
