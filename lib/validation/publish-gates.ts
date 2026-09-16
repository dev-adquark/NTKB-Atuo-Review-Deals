export interface PublishGateResult {
  key: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface PublishGateInput {
  apiResponseValid: boolean;
  requiredContentPresent: boolean;
  hasSeoTitle: boolean;
  hasMetaDescription: boolean;
  hasCanonical: boolean;
  hasH1: boolean;
  affiliateRequired: boolean;
  affiliateResolved: boolean;
  affiliateDisclosurePresent: boolean;
  sponsoredActive: boolean;
  sponsoredDisclosurePresent: boolean;
  uniquenessScore: number;
  uniquenessMinScore: number;
  noUnresolvedPlaceholders: boolean;
  noProhibitedClaims: boolean;
  faqJsonLdMatchesVisibleContent: boolean;
}

/** The hard publish gate checklist (spec section 71). Publish is blocked unless every gate passes. */
export function evaluatePublishGates(input: PublishGateInput): PublishGateResult[] {
  return [
    { key: "apiResponseValid", label: "API response valid", passed: input.apiResponseValid },
    { key: "requiredContentPresent", label: "Required content present", passed: input.requiredContentPresent },
    { key: "seoTitle", label: "SEO title", passed: input.hasSeoTitle },
    { key: "metaDescription", label: "Meta description", passed: input.hasMetaDescription },
    { key: "canonical", label: "Canonical URL", passed: input.hasCanonical },
    { key: "h1", label: "H1 present", passed: input.hasH1 },
    {
      key: "affiliateMapping",
      label: "Affiliate mapping",
      passed: !input.affiliateRequired || input.affiliateResolved,
      detail: input.affiliateRequired && !input.affiliateResolved ? "No admin affiliate mapping found for this brand/region." : undefined,
    },
    {
      key: "affiliateDisclosure",
      label: "Affiliate disclosure",
      passed: !input.affiliateRequired || !input.affiliateResolved || input.affiliateDisclosurePresent,
    },
    {
      key: "sponsoredDisclosure",
      label: "Sponsored disclosure",
      passed: !input.sponsoredActive || input.sponsoredDisclosurePresent,
    },
    {
      key: "uniqueness",
      label: "Uniqueness",
      passed: input.uniquenessScore >= input.uniquenessMinScore,
      detail: `score ${input.uniquenessScore.toFixed(2)} / min ${input.uniquenessMinScore.toFixed(2)}`,
    },
    { key: "placeholders", label: "No unresolved placeholders", passed: input.noUnresolvedPlaceholders },
    { key: "claims", label: "No unsupported claims", passed: input.noProhibitedClaims },
    { key: "faqSchema", label: "FAQ schema matches visible content", passed: input.faqJsonLdMatchesVisibleContent },
  ];
}

export function allGatesPassed(gates: PublishGateResult[]): boolean {
  return gates.every((gate) => gate.passed);
}
