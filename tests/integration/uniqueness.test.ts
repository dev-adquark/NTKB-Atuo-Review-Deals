import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { computeUniqueness } from "@/lib/validation/uniqueness";

const DISTINCTIVE_HEADING = "Zzyzx Uniqueness Fixture Section";
const DISTINCTIVE_CONTENT =
  "Zzyzx quokka telemetry widgets ship with a bespoke flux capacitor calibration routine unique to this test fixture.";

// Hits the real database. Fixtures are created by this test file itself (rather
// than assuming specific pre-existing content/mock-provider wording) so it stays
// meaningful regardless of what else has been generated in this database.
describe("computeUniqueness", () => {
  let regionId: string;
  let jobId: string;
  let pageId: string;

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
        title: "Uniqueness fixture",
        slug: `uniqueness-fixture-${Date.now()}`,
        metaDescription: "fixture",
        canonicalPath: "/us/uniqueness-fixture",
        content: {
          generated: {
            title: "Uniqueness fixture",
            content: { sections: [{ heading: DISTINCTIVE_HEADING, level: 2, content: DISTINCTIVE_CONTENT }] },
          },
          disclosures: [],
        },
        seo: {},
        contentHash: "fixture-hash",
        status: "READY_FOR_REVIEW", // computeUniqueness excludes DRAFT (rejected) pages from its comparison pool
      },
    });
    pageId = page.id;
  });

  afterAll(async () => {
    await prisma.generatedPage.delete({ where: { id: pageId } });
    await prisma.generationJob.delete({ where: { id: jobId } });
  });

  it("scores completely unrelated content higher than a near-duplicate of a known fixture", async () => {
    const unrelated = await computeUniqueness(
      [
        {
          heading: "Vacuum Cleaner Buying Guide",
          level: 2,
          content:
            "Cordless stick vacuums trade runtime for maneuverability, while canister models favor suction power and a larger dust bin for deep cleaning carpets.",
        },
      ],
      "KEYWORD_REVIEW",
    );

    const duplicate = await computeUniqueness(
      [{ heading: DISTINCTIVE_HEADING, level: 2, content: DISTINCTIVE_CONTENT }],
      "KEYWORD_REVIEW",
    );

    expect(unrelated.score).toBeGreaterThan(duplicate.score);
    expect(duplicate.duplicatedSections).toContain(DISTINCTIVE_HEADING);
  });

  describe("excludePageId", () => {
    it("without excludePageId, a page's own content is detected as a duplicate of itself", async () => {
      const result = await computeUniqueness(
        [{ heading: DISTINCTIVE_HEADING, level: 2, content: DISTINCTIVE_CONTENT }],
        "KEYWORD_REVIEW",
      );
      expect(result.duplicatedSections).toContain(DISTINCTIVE_HEADING);
    });

    it("with excludePageId set to that same page, it is no longer flagged as a duplicate of itself", async () => {
      const result = await computeUniqueness(
        [{ heading: DISTINCTIVE_HEADING, level: 2, content: DISTINCTIVE_CONTENT }],
        "KEYWORD_REVIEW",
        pageId,
      );
      expect(result.duplicatedSections).not.toContain(DISTINCTIVE_HEADING);
    });

    it("also accepts an array of page IDs to exclude (used when regenerating a keyword that already has prior published versions)", async () => {
      const result = await computeUniqueness(
        [{ heading: DISTINCTIVE_HEADING, level: 2, content: DISTINCTIVE_CONTENT }],
        "KEYWORD_REVIEW",
        [pageId, "some-other-nonexistent-id"],
      );
      expect(result.duplicatedSections).not.toContain(DISTINCTIVE_HEADING);
    });
  });
});
