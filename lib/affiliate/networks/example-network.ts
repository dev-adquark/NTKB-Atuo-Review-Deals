import "server-only";
import type { AffiliateLookupInput, AffiliateLookupResult, AffiliateNetworkProvider } from "./types";

/**
 * Reference implementation showing the shape a real affiliate network integration
 * would take. It is intentionally a no-op (returns null, meaning "no link found")
 * because no real network credentials/contract are configured — per spec section
 * 66, this application never scrapes or fabricates an affiliate URL. Wire a real
 * network here (with its own API key from env) when one is actually contracted;
 * until then, admin mappings remain the only source of affiliate URLs.
 */
export class ExampleNetworkProvider implements AffiliateNetworkProvider {
  readonly name = "example-network";

  async findLink(_input: AffiliateLookupInput): Promise<AffiliateLookupResult | null> {
    if (!process.env.EXAMPLE_NETWORK_API_KEY) {
      return null;
    }
    // A real provider would call its network's API here, e.g.:
    //   const response = await fetch(`https://api.example-network.com/links?brand=...`, {
    //     headers: { Authorization: `Bearer ${process.env.EXAMPLE_NETWORK_API_KEY}` },
    //   });
    //   ...validate and return the URL it provides...
    return null;
  }
}
