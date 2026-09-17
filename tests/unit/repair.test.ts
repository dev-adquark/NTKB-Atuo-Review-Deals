import { describe, expect, it } from "vitest";
import { repairProhibitedClaims, isFreeOfProhibitedClaims } from "@/lib/validation/repair";
import { scanForProhibitedClaims } from "@/lib/validation/claims";
import type { GeneratedContentResult } from "@/lib/content-engine/types";

function makeResult(overrides: Partial<GeneratedContentResult["content"]>): GeneratedContentResult {
  return {
    requestId: "test",
    title: "Best Wireless Earbuds",
    metaDescription: "A guide to earbuds",
    primaryKeyword: "best wireless earbuds",
    content: {
      intro: "Intro text.",
      sections: [{ heading: "Overview", level: 2, content: "Overview text." }],
      ...overrides,
    },
  };
}

describe("repairProhibitedClaims", () => {
  it("softens a guarantee claim without inventing a replacement claim", () => {
    const input = makeResult({ intro: "This product guarantees results." });
    const { result, repaired } = repairProhibitedClaims(input);
    expect(repaired).toContain("guarantee claim");
    expect(result.content.intro).not.toMatch(/guarantee/i);
    expect(isFreeOfProhibitedClaims(result)).toBe(true);
  });

  it("removes an unsupported exact price without inventing a different price", () => {
    const input = makeResult({ sections: [{ heading: "Overview", level: 2, content: "This model costs $100 and works great." }] });
    const { result, repaired } = repairProhibitedClaims(input);
    expect(repaired).toContain("unverified price figure");
    const text = result.content.sections[0].content;
    expect(text).not.toMatch(/\$\d/);
    // Never invent a replacement price — no new dollar figure should appear.
    expect(text.match(/\$\s?\d/g)).toBeNull();
    expect(isFreeOfProhibitedClaims(result)).toBe(true);
  });

  it("repairs guarantee and unsupported price together in one pass, matching the real observed failure", () => {
    const input = makeResult({
      sections: [
        {
          heading: "Overview",
          level: 2,
          content: 'This model costs $100 and guarantees results for every user.',
        },
      ],
    });
    const before = scanForProhibitedClaims(input.content.sections[0].content);
    expect(before.map((f) => f.label)).toEqual(expect.arrayContaining(["guarantee claim", "unverified price figure"]));

    const { result } = repairProhibitedClaims(input);
    expect(isFreeOfProhibitedClaims(result)).toBe(true);
  });

  it("repairs every prohibited-claim field across title, sections, pros/cons, faq, and conclusion", () => {
    const input: GeneratedContentResult = {
      requestId: "test",
      title: "The #1 Best Product",
      metaDescription: "Guaranteed savings await.",
      primaryKeyword: "best product",
      content: {
        intro: "This is a risk-free purchase.",
        sections: [{ heading: "Overview", level: 2, content: "Clinically proven to work." }],
        pros: ["Cures your problems instantly"],
        cons: ["None — 100% miracle"],
        faq: [{ question: "Is it safe?", answer: "It guarantees safety." }],
        conclusion: "In summary, this is the number one choice.",
      },
    };
    const { result } = repairProhibitedClaims(input);
    expect(isFreeOfProhibitedClaims(result)).toBe(true);
  });

  it("is a no-op when no prohibited claims are present", () => {
    const input = makeResult({ intro: "A clear, factual overview of the product." });
    const { result, repaired } = repairProhibitedClaims(input);
    expect(repaired).toHaveLength(0);
    expect(result.content.intro).toBe(input.content.intro);
  });

  it("never introduces a new dollar amount when repairing a discount percentage", () => {
    const input = makeResult({ intro: "Save 50% off today." });
    const { result } = repairProhibitedClaims(input);
    expect(result.content.intro).not.toMatch(/\d+\s*%/);
    expect(result.content.intro).not.toMatch(/\$\d/);
  });
});
