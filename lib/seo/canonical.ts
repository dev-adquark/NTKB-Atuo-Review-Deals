import type { PageType } from "@/app/generated/prisma/client";

function getSiteUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not configured");
  }
  return siteUrl.replace(/\/$/, "");
}

/** Deterministic canonical path rules (spec section 24). */
export function buildCanonicalPath(params: {
  pageType: PageType;
  regionPrefix: string;
  slug: string;
  brandSlug?: string;
}): string {
  const { pageType, regionPrefix, slug, brandSlug } = params;
  switch (pageType) {
    case "KEYWORD_REVIEW":
      return `/${regionPrefix}/${slug}`;
    case "BRAND_REVIEW":
      return `/${regionPrefix}/reviews/${brandSlug ?? slug}`;
    case "TOP_PICKS":
      return `/${regionPrefix}/deals/${slug}`;
  }
}

export function buildCanonicalUrl(path: string): string {
  return `${getSiteUrl()}${path}`;
}

export function isProductionSiteUrl(): boolean {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return Boolean(siteUrl) && !siteUrl.includes("localhost") && !siteUrl.includes("127.0.0.1");
}
