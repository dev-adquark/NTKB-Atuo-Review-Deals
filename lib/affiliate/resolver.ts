import "server-only";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getOrCreatePlatformSettings } from "@/lib/settings";
import { AFFILIATE_NETWORK_PROVIDERS } from "./networks";
import type { AffiliateSource } from "@/app/generated/prisma/client";

export interface ResolvedAffiliate {
  url: string;
  source: AffiliateSource;
}

/**
 * Resolves the region-specific affiliate URL for a brand. Admin mappings always win
 * (spec rule 7) and are checked first. Only when none exists — and only when network
 * fallback is enabled in Settings — do registered network providers get a chance
 * (spec section 65); every lookup is audit logged, and a found link is persisted as
 * a NETWORK-sourced mapping only if an admin mapping still doesn't exist by then
 * (never overwriting one), so it isn't re-looked-up on every future resolution.
 */
export async function resolveAffiliateUrl(brandId: string, regionId: string): Promise<ResolvedAffiliate | null> {
  const mapping = await prisma.affiliateMapping.findUnique({
    where: { brandId_regionId: { brandId, regionId } },
  });
  if (mapping && mapping.active) return { url: mapping.url, source: mapping.source };

  const settings = await getOrCreatePlatformSettings();
  if (!settings.networkFallbackEnabled || AFFILIATE_NETWORK_PROVIDERS.length === 0) return null;

  const [brand, region] = await Promise.all([
    prisma.brand.findUnique({ where: { id: brandId } }),
    prisma.region.findUnique({ where: { id: regionId } }),
  ]);
  if (!brand || !region) return null;

  for (const provider of AFFILIATE_NETWORK_PROVIDERS) {
    const result = await provider.findLink({ brandId, brandName: brand.name, regionCode: region.code });
    await logAudit({
      action: "affiliate.network.lookup",
      entityType: "AffiliateMapping",
      metadata: { provider: provider.name, brandId, regionId, found: Boolean(result) },
    });
    if (!result) continue;

    const saved = await prisma.affiliateMapping.upsert({
      where: { brandId_regionId: { brandId, regionId } },
      create: { brandId, regionId, url: result.url, source: "NETWORK", active: true },
      update: {}, // a row already exists (e.g. an admin mapping landed first) — never overwrite it
    });
    return { url: saved.url, source: saved.source };
  }

  return null;
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
