import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getHreflangAlternates } from "@/lib/seo/hreflang";
import { buildCanonicalUrl } from "@/lib/seo/canonical";

describe("getHreflangAlternates", () => {
  const suffix = Date.now();
  const keywordText = `Hreflang Fixture Keyword ${suffix}`;
  let usRegion: { id: string; language: string };
  let inRegion: { id: string; language: string };
  let euRegion: { id: string; language: string };
  const jobIds: string[] = [];
  const pageIds: string[] = [];
  const keywordIds: string[] = [];

  async function createPublishedPage(regionId: string, slug: string) {
    const job = await prisma.generationJob.create({
      data: { regionId, pageType: "KEYWORD_REVIEW", status: "GENERATED", configVersion: "test", requestPayload: {} },
    });
    jobIds.push(job.id);
    const keyword = await prisma.keyword.create({
      data: { text: keywordText, slug, regionId, pageType: "KEYWORD_REVIEW" },
    });
    keywordIds.push(keyword.id);
    const page = await prisma.generatedPage.create({
      data: {
        generationJobId: job.id,
        keywordId: keyword.id,
        regionId,
        pageType: "KEYWORD_REVIEW",
        version: 1,
        title: "Hreflang fixture",
        slug,
        metaDescription: "fixture",
        canonicalPath: `/x/${slug}`,
        content: { sections: [] },
        seo: {},
        contentHash: `fixture-${slug}`,
        status: "PUBLISHED",
        isCurrent: true,
      },
    });
    pageIds.push(page.id);
    return page;
  }

  beforeAll(async () => {
    usRegion = await prisma.region.findUniqueOrThrow({ where: { code: "US" } });
    inRegion = await prisma.region.findUniqueOrThrow({ where: { code: "IN" } });
    euRegion = await prisma.region.findUniqueOrThrow({ where: { code: "EU" } });
  });

  afterAll(async () => {
    await prisma.generatedPage.deleteMany({ where: { id: { in: pageIds } } });
    await prisma.keyword.deleteMany({ where: { id: { in: keywordIds } } });
    await prisma.generationJob.deleteMany({ where: { id: { in: jobIds } } });
  });

  it("includes only regions with an actually published counterpart page", async () => {
    const usPage = await createPublishedPage(usRegion.id, `hreflang-us-${suffix}`);
    const inPage = await createPublishedPage(inRegion.id, `hreflang-in-${suffix}`);
    // EU keyword deliberately left unpublished (no page created for it).

    const alternates = await getHreflangAlternates({
      pageType: "KEYWORD_REVIEW",
      selfPageId: usPage.id,
      keywordText,
    });

    expect(alternates[inRegion.language]).toBe(buildCanonicalUrl(inPage.canonicalPath));
    expect(alternates[usRegion.language]).toBeUndefined(); // never links to itself
    expect(alternates[euRegion.language]).toBeUndefined(); // never a fake/unpublished entry
  });
});
