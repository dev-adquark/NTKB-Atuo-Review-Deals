import "server-only";
import { prisma } from "@/lib/db";
import type { AffiliateSource } from "@/app/generated/prisma/client";

export interface ResolvedAffiliate {
  url: string;
  source: AffiliateSource;
}

/**
 * Resolves the region-specific affiliate URL for a brand. Admin mappings always win
 * (spec rule 7) — this application does not implement an affiliate network fallback
 * yet, so a missing mapping simply means "no affiliate URL available" rather than a
 * fabricated or scraped one (spec rule 6, section 66).
 */
export async function resolveAffiliateUrl(brandId: string, regionId: string): Promise<ResolvedAffiliate | null> {
  const mapping = await prisma.affiliateMapping.findUnique({
    where: { brandId_regionId: { brandId, regionId } },
  });
  if (!mapping || !mapping.active) return null;
  return { url: mapping.url, source: mapping.source };
}

export interface PlaceholderResolution {
  text: string;
  unresolved: string[];
}

export function resolvePlaceholders(text: string, vars: Record<string, string>): PlaceholderResolution {
  const unresolved: string[] = [];
  const resolvedText = text.replace(/\{([a-zA-Z_]+)\}/g, (match, key: string) => {
    if (key in vars) return vars[key];
    unresolved.push(match);
    return match;
  });
  return { text: resolvedText, unresolved };
}
