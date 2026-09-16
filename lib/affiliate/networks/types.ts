export interface AffiliateLookupInput {
  brandId: string;
  brandName: string;
  regionCode: string;
}

export interface AffiliateLookupResult {
  url: string;
  network: string;
}

/**
 * Common interface every affiliate network integration implements (spec section
 * 65). Only invoked when network fallback is enabled AND no admin mapping exists
 * for the brand+region — an admin mapping always wins and is never overwritten
 * (spec rule 7/8). No implementation may scrape URLs from arbitrary sources
 * (spec section 66): a provider either calls its network's real API, or is a
 * clearly-labeled no-op like the example provider in this directory.
 */
export interface AffiliateNetworkProvider {
  readonly name: string;
  findLink(input: AffiliateLookupInput): Promise<AffiliateLookupResult | null>;
}
