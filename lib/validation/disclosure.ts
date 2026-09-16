export const AFFILIATE_DISCLOSURE_TEXT =
  "Disclosure: We may earn a commission when you purchase through links on this page.";

export const DEFAULT_SPONSORED_LABEL = "Sponsored — Brand Spotlight";

export interface DisclosureBlock {
  type: "affiliate" | "sponsored";
  label?: string;
  text: string;
}

/**
 * Disclosures are added unconditionally by this application rather than trusted from
 * generated content, so a monetized or sponsored page can never publish without one
 * (spec sections 18, 105).
 */
export function buildDisclosureBlocks(params: {
  hasAffiliateLinks: boolean;
  sponsored?: { sponsorLabel: string; disclosure: string } | null;
}): DisclosureBlock[] {
  const blocks: DisclosureBlock[] = [];
  if (params.hasAffiliateLinks) {
    blocks.push({ type: "affiliate", text: AFFILIATE_DISCLOSURE_TEXT });
  }
  if (params.sponsored) {
    blocks.push({
      type: "sponsored",
      label: params.sponsored.sponsorLabel || DEFAULT_SPONSORED_LABEL,
      text: params.sponsored.disclosure,
    });
  }
  return blocks;
}
