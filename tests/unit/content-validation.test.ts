import { describe, expect, it } from "vitest";
import { validateGeneratedContent, validatePlaceholdersResolved } from "@/lib/validation/content";
import type { GenerationRequest, GeneratedContentResult } from "@/lib/content-engine/types";

const baseRequest: GenerationRequest = {
  pageType: "keyword-review",
  keyword: "best password managers",
  brand: null,
  region: "US",
  language: "en-US",
  configuration: { includeFaq: true, includeProsCons: true, includeComparison: true },
};

function validResult(): GeneratedContentResult {
  return {
    title: "Best Password Managers",
    content: {
      intro: "intro",
      sections: [{ heading: "Overview", level: 2, content: "Solid coverage of the basics." }],
      pros: ["Easy setup"],
      cons: ["Pricing varies"],
      comparison: [{ name: "Brand A" }],
      faq: [{ question: "Q?", answer: "A." }],
      conclusion: "Check the current price before purchasing.",
    },
  };
}

describe("validateGeneratedContent", () => {
  it("passes for a complete, compliant response", () => {
    expect(validateGeneratedContent(validResult(), baseRequest)).toEqual([]);
  });

  it("flags a missing title", () => {
    const result = { ...validResult(), title: "  " };
    const issues = validateGeneratedContent(result, baseRequest);
    expect(issues.some((i) => i.message.includes("missing a title"))).toBe(true);
  });

  it("flags empty sections", () => {
    const result = { ...validResult(), content: { ...validResult().content, sections: [] } };
    const issues = validateGeneratedContent(result, baseRequest);
    expect(issues.some((i) => i.message.includes("content.sections"))).toBe(true);
  });

  it("requires FAQ when includeFaq was requested", () => {
    const result = { ...validResult(), content: { ...validResult().content, faq: undefined } };
    const issues = validateGeneratedContent(result, baseRequest);
    expect(issues.some((i) => i.message.includes("FAQ"))).toBe(true);
  });

  it("requires pros/cons when includeProsCons was requested", () => {
    const result = { ...validResult(), content: { ...validResult().content, pros: [], cons: [] } };
    const issues = validateGeneratedContent(result, baseRequest);
    expect(issues.some((i) => i.message.includes("Pros/cons"))).toBe(true);
  });

  it("requires comparison when includeComparison was requested", () => {
    const result = { ...validResult(), content: { ...validResult().content, comparison: [] } };
    const issues = validateGeneratedContent(result, baseRequest);
    expect(issues.some((i) => i.message.includes("Comparison"))).toBe(true);
  });

  it("flags prohibited claims embedded in content", () => {
    const result = { ...validResult(), content: { ...validResult().content, conclusion: "Guaranteed savings of $49." } };
    const issues = validateGeneratedContent(result, baseRequest);
    expect(issues.some((i) => i.code === "PROHIBITED_CLAIM")).toBe(true);
  });

  it("trusts the external provider's own quality verdict when it reports a failure", () => {
    const result = { ...validResult(), qualityStatus: "revision_exhausted", qualityScore: 40 };
    const issues = validateGeneratedContent(result, baseRequest);
    expect(issues.some((i) => i.code === "CONTENT_QUALITY_FAILED")).toBe(true);
  });

  it("does not flag quality when the provider reports pass (or reports nothing)", () => {
    expect(validateGeneratedContent({ ...validResult(), qualityStatus: "pass" }, baseRequest)).toEqual([]);
    expect(validateGeneratedContent(validResult(), baseRequest)).toEqual([]);
  });
});

describe("validatePlaceholdersResolved", () => {
  it("passes when no placeholders remain", () => {
    expect(validatePlaceholdersResolved(["Fully resolved text."])).toEqual([]);
  });

  it("flags any remaining {placeholder} token", () => {
    const issues = validatePlaceholdersResolved(['<a href="{brand_aff_url}">Buy</a>']);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("UNRESOLVED_PLACEHOLDER");
    expect(issues[0].message).toContain("{brand_aff_url}");
  });
});
