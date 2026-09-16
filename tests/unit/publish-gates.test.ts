import { describe, expect, it } from "vitest";
import { evaluatePublishGates, allGatesPassed, type PublishGateInput } from "@/lib/validation/publish-gates";

function passingInput(overrides: Partial<PublishGateInput> = {}): PublishGateInput {
  return {
    apiResponseValid: true,
    requiredContentPresent: true,
    hasSeoTitle: true,
    hasMetaDescription: true,
    hasCanonical: true,
    hasH1: true,
    affiliateRequired: true,
    affiliateResolved: true,
    affiliateDisclosurePresent: true,
    sponsoredActive: false,
    sponsoredDisclosurePresent: false,
    uniquenessScore: 0.9,
    uniquenessMinScore: 0.6,
    noUnresolvedPlaceholders: true,
    noProhibitedClaims: true,
    faqJsonLdMatchesVisibleContent: true,
    ...overrides,
  };
}

describe("evaluatePublishGates / allGatesPassed", () => {
  it("passes every gate for a fully compliant page", () => {
    const gates = evaluatePublishGates(passingInput());
    expect(allGatesPassed(gates)).toBe(true);
  });

  it("blocks publish when a required affiliate mapping is missing", () => {
    const gates = evaluatePublishGates(passingInput({ affiliateResolved: false }));
    expect(allGatesPassed(gates)).toBe(false);
    expect(gates.find((g) => g.key === "affiliateMapping")?.passed).toBe(false);
  });

  it("does not require an affiliate mapping when the page isn't monetized", () => {
    const gates = evaluatePublishGates(passingInput({ affiliateRequired: false, affiliateResolved: false, affiliateDisclosurePresent: false }));
    expect(gates.find((g) => g.key === "affiliateMapping")?.passed).toBe(true);
    expect(gates.find((g) => g.key === "affiliateDisclosure")?.passed).toBe(true);
  });

  it("blocks publish when sponsored but disclosure is missing", () => {
    const gates = evaluatePublishGates(passingInput({ sponsoredActive: true, sponsoredDisclosurePresent: false }));
    expect(allGatesPassed(gates)).toBe(false);
    expect(gates.find((g) => g.key === "sponsoredDisclosure")?.passed).toBe(false);
  });

  it("blocks publish when uniqueness is below the configured minimum", () => {
    const gates = evaluatePublishGates(passingInput({ uniquenessScore: 0.4, uniquenessMinScore: 0.6 }));
    expect(allGatesPassed(gates)).toBe(false);
    expect(gates.find((g) => g.key === "uniqueness")?.passed).toBe(false);
  });

  it("blocks publish on unresolved placeholders or prohibited claims", () => {
    expect(allGatesPassed(evaluatePublishGates(passingInput({ noUnresolvedPlaceholders: false })))).toBe(false);
    expect(allGatesPassed(evaluatePublishGates(passingInput({ noProhibitedClaims: false })))).toBe(false);
  });
});
