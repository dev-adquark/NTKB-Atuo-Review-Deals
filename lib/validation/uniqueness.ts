import "server-only";
import { prisma } from "@/lib/db";
import type { PageType } from "@/app/generated/prisma/client";
import type { GeneratedContentSection } from "@/lib/content-engine/types";
import type { StoredPageContent } from "@/lib/publishing/types";

export interface UniquenessResult {
  score: number;
  duplicatedSections: string[];
}

const SIMILARITY_DUPLICATE_THRESHOLD = 0.8;
const COMPARISON_SAMPLE_SIZE = 100;

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Compares the candidate page's sections against recently generated pages of the same
 * page type (across all regions, since the same underlying content could otherwise be
 * duplicated region-to-region) and produces a uniqueness score in [0, 1] plus the list
 * of section headings that look duplicated. This runs in addition to, not instead of,
 * the external Content Generation Engine's own originality — spec section 22.
 */
export async function computeUniqueness(
  candidateSections: GeneratedContentSection[],
  pageType: PageType,
  excludePageId?: string | string[],
): Promise<UniquenessResult> {
  const excludeIds = excludePageId ? (Array.isArray(excludePageId) ? excludePageId : [excludePageId]) : [];
  const existingPages = await prisma.generatedPage.findMany({
    where: {
      pageType,
      // Exclude rejected drafts (status DRAFT is set specifically when a page
      // failed validation, see lib/publishing/pipeline.ts) from the comparison
      // pool. Otherwise every rejected near-duplicate attempt would itself count
      // as "existing content" for the next attempt to be compared against,
      // making the pool progressively harder to pass without adding any real
      // diversity — a rejected page was never real content worth protecting.
      status: { not: "DRAFT" },
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: COMPARISON_SAMPLE_SIZE,
    select: { content: true },
  });

  const existingSectionTokenSets: Set<string>[] = [];
  for (const page of existingPages) {
    const content = page.content as unknown as StoredPageContent | null;
    for (const section of content?.generated?.content?.sections ?? []) {
      existingSectionTokenSets.push(tokenize(section.content));
    }
  }

  if (existingSectionTokenSets.length === 0 || candidateSections.length === 0) {
    return { score: 1, duplicatedSections: [] };
  }

  const duplicatedSections: string[] = [];
  let totalMaxSimilarity = 0;

  for (const section of candidateSections) {
    const candidateTokens = tokenize(section.content);
    let maxSimilarity = 0;
    for (const existingTokens of existingSectionTokenSets) {
      const similarity = jaccardSimilarity(candidateTokens, existingTokens);
      if (similarity > maxSimilarity) maxSimilarity = similarity;
    }
    totalMaxSimilarity += maxSimilarity;
    if (maxSimilarity >= SIMILARITY_DUPLICATE_THRESHOLD) {
      duplicatedSections.push(section.heading);
    }
  }

  const avgMaxSimilarity = totalMaxSimilarity / candidateSections.length;
  const score = Math.max(0, 1 - avgMaxSimilarity);
  return { score, duplicatedSections };
}
