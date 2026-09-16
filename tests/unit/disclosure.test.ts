import { describe, expect, it } from "vitest";
import { buildDisclosureBlocks, AFFILIATE_DISCLOSURE_TEXT } from "@/lib/validation/disclosure";

describe("buildDisclosureBlocks", () => {
  it("adds no blocks when there are no affiliate links and no sponsorship", () => {
    expect(buildDisclosureBlocks({ hasAffiliateLinks: false })).toEqual([]);
  });

  it("adds the affiliate disclosure when the page has affiliate links", () => {
    const blocks = buildDisclosureBlocks({ hasAffiliateLinks: true });
    expect(blocks).toEqual([{ type: "affiliate", text: AFFILIATE_DISCLOSURE_TEXT }]);
  });

  it("adds a sponsored disclosure block with its own label and text when sponsored", () => {
    const blocks = buildDisclosureBlocks({
      hasAffiliateLinks: true,
      sponsored: { sponsorLabel: "Sponsored — Brand X", disclosure: "Paid partnership with Brand X." },
    });
    expect(blocks).toEqual([
      { type: "affiliate", text: AFFILIATE_DISCLOSURE_TEXT },
      { type: "sponsored", label: "Sponsored — Brand X", text: "Paid partnership with Brand X." },
    ]);
  });

  it("can add a sponsored disclosure even without affiliate links", () => {
    const blocks = buildDisclosureBlocks({
      hasAffiliateLinks: false,
      sponsored: { sponsorLabel: "Sponsored", disclosure: "Paid partnership." },
    });
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("sponsored");
  });
});
