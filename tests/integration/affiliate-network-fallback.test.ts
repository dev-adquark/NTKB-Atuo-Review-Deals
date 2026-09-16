import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { resolveAffiliateUrl } from "@/lib/affiliate/resolver";
import { getOrCreatePlatformSettings } from "@/lib/settings";

describe("resolveAffiliateUrl — network fallback never overrides an admin mapping", () => {
  let brandId: string;
  let regionId: string;
  let originalNetworkFallbackEnabled: boolean;

  beforeAll(async () => {
    const settings = await getOrCreatePlatformSettings();
    originalNetworkFallbackEnabled = settings.networkFallbackEnabled;

    const brand = await prisma.brand.create({
      data: { name: `Test Network Fallback Brand ${Date.now()}`, slug: `test-network-fallback-${Date.now()}` },
    });
    brandId = brand.id;
    const region = await prisma.region.findUniqueOrThrow({ where: { code: "EU" } });
    regionId = region.id;

    await prisma.affiliateMapping.create({
      data: { brandId, regionId, url: "https://affiliate.example/admin-set", source: "ADMIN" },
    });
  });

  afterAll(async () => {
    await prisma.affiliateMapping.deleteMany({ where: { brandId } });
    await prisma.brand.delete({ where: { id: brandId } });
    await prisma.platformSettings.update({ where: { id: "singleton" }, data: { networkFallbackEnabled: originalNetworkFallbackEnabled } });
  });

  it("returns the existing admin mapping even when network fallback is enabled", async () => {
    await prisma.platformSettings.update({ where: { id: "singleton" }, data: { networkFallbackEnabled: true } });
    const resolved = await resolveAffiliateUrl(brandId, regionId);
    expect(resolved).toEqual({ url: "https://affiliate.example/admin-set", source: "ADMIN" });
  });

  it("never invokes network lookup when fallback is disabled and no mapping exists", async () => {
    await prisma.platformSettings.update({ where: { id: "singleton" }, data: { networkFallbackEnabled: false } });
    const brand2 = await prisma.brand.create({
      data: { name: `Test No Mapping Brand ${Date.now()}`, slug: `test-no-mapping-${Date.now()}` },
    });
    try {
      const resolved = await resolveAffiliateUrl(brand2.id, regionId);
      expect(resolved).toBeNull();
    } finally {
      await prisma.brand.delete({ where: { id: brand2.id } });
    }
  });
});
