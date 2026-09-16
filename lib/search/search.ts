import "server-only";
import { prisma } from "@/lib/db";

export interface PublicSearchResult {
  id: string;
  title: string;
  canonicalPath: string;
  regionCode: string;
}

/** Public search — only ever returns currently-published pages, never drafts/unpublished. */
export async function searchPublishedPages(query: string, limit = 20): Promise<PublicSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const pages = await prisma.generatedPage.findMany({
    where: {
      status: "PUBLISHED",
      isCurrent: true,
      OR: [
        { title: { contains: trimmed, mode: "insensitive" } },
        { metaDescription: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    include: { region: true },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });

  return pages.map((p) => ({ id: p.id, title: p.title, canonicalPath: p.canonicalPath, regionCode: p.region.code }));
}

export interface AdminSearchResults {
  pages: Array<{ id: string; title: string; status: string; regionCode: string }>;
  keywords: Array<{ id: string; text: string; regionCode: string }>;
  brands: Array<{ id: string; name: string; slug: string }>;
}

/** Admin search spans every status (drafts included) — never exposed to public users. */
export async function searchAdminEntities(query: string, limit = 15): Promise<AdminSearchResults> {
  const trimmed = query.trim();
  if (!trimmed) return { pages: [], keywords: [], brands: [] };

  const [pages, keywords, brands] = await Promise.all([
    prisma.generatedPage.findMany({
      where: { title: { contains: trimmed, mode: "insensitive" } },
      include: { region: true },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    prisma.keyword.findMany({
      where: { text: { contains: trimmed, mode: "insensitive" } },
      include: { region: true },
      take: limit,
    }),
    prisma.brand.findMany({
      where: { name: { contains: trimmed, mode: "insensitive" } },
      take: limit,
    }),
  ]);

  return {
    pages: pages.map((p) => ({ id: p.id, title: p.title, status: p.status, regionCode: p.region.code })),
    keywords: keywords.map((k) => ({ id: k.id, text: k.text, regionCode: k.region.code })),
    brands: brands.map((b) => ({ id: b.id, name: b.name, slug: b.slug })),
  };
}
