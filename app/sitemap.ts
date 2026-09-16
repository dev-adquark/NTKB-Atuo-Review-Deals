import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { buildCanonicalUrl } from "@/lib/seo/canonical";

// Route Handlers (sitemap.ts is one) are cached by default in Next.js 16 — force
// dynamic so newly published pages appear immediately rather than a stale build.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [regions, pages] = await Promise.all([
    prisma.region.findMany({ where: { active: true } }),
    prisma.generatedPage.findMany({
      where: { status: "PUBLISHED", isCurrent: true },
      select: { canonicalPath: true, updatedAt: true, publishedAt: true },
    }),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: buildCanonicalUrl("/"), lastModified: new Date() },
    { url: buildCanonicalUrl("/affiliate-disclosure"), lastModified: new Date() },
    { url: buildCanonicalUrl("/privacy"), lastModified: new Date() },
    { url: buildCanonicalUrl("/terms"), lastModified: new Date() },
    ...regions.map((region) => ({ url: buildCanonicalUrl(`/${region.urlPrefix}`), lastModified: new Date() })),
  ];

  const pageEntries: MetadataRoute.Sitemap = pages.map((page) => ({
    url: buildCanonicalUrl(page.canonicalPath),
    lastModified: page.updatedAt,
  }));

  return [...staticEntries, ...pageEntries];
}
