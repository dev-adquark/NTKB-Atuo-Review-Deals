import type { AffiliateNetworkProvider } from "./types";
import { ExampleNetworkProvider } from "./example-network";

/** Registered network providers, tried in order until one returns a link. */
export const AFFILIATE_NETWORK_PROVIDERS: AffiliateNetworkProvider[] = [new ExampleNetworkProvider()];
