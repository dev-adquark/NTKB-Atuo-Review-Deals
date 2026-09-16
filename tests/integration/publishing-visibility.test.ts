import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getPublishedPage } from "@/lib/render/public-page";

describe("getPublishedPage (draft visibility)", () => {
  const slug = `draft-visibility-fixture-${Date.now()}`;
  let regionId: string;
  let jobId: string;
  let draftPageId: string;

  beforeAll(async () => {
    const region = await prisma.region.findUniqueOrThrow({ where: { code: "US" } });
    regionId = region.id;
    const job = await prisma.generationJob.create({
      data: { regionId, pageType: "KEYWORD_REVIEW", status: "GENERATED", configVersion: "test", requestPayload: {} },
    });
    jobId = job.id;
    const page = await prisma.generatedPage.create({
      data: {
        generationJobId: jobId,
        regionId,
        pageType: "KEYWORD_REVIEW",
        version: 1,
        title: "Draft visibility fixture",
        slug,
        metaDescription: "fixture",
        canonicalPath: `/us/${slug}`,
        content: { generated: { title: "x", content: { sections: [] } }, disclosures: [] },
        seo: {},
        contentHash: "fixture",
        status: "DRAFT",
        isCurrent: false,
      },
    });
    draftPageId = page.id;
  });

  afterAll(async () => {
    await prisma.generatedPage.delete({ where: { id: draftPageId } });
    await prisma.generationJob.delete({ where: { id: jobId } });
  });

  it("never returns a DRAFT page, regardless of slug/region/pageType match", async () => {
    const result = await getPublishedPage({ regionId, pageType: "KEYWORD_REVIEW", slug });
    expect(result).toBeNull();
  });

  it("returns the page once it is marked PUBLISHED and isCurrent", async () => {
    await prisma.generatedPage.update({ where: { id: draftPageId }, data: { status: "PUBLISHED", isCurrent: true } });
    const result = await getPublishedPage({ regionId, pageType: "KEYWORD_REVIEW", slug });
    expect(result?.id).toBe(draftPageId);
  });

  it("stops returning it once unpublished again", async () => {
    await prisma.generatedPage.update({ where: { id: draftPageId }, data: { status: "UNPUBLISHED", isCurrent: false } });
    const result = await getPublishedPage({ regionId, pageType: "KEYWORD_REVIEW", slug });
    expect(result).toBeNull();
  });
});
