import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { resolveAffiliateUrl } from "@/lib/affiliate/resolver";

// Hits the real configured database (DATABASE_URL) — this is the only way to
// meaningfully verify region isolation, since it depends on the brandId+regionId
// compound unique constraint actually enforced by Postgres/Prisma.
describe("resolveAffiliateUrl (region isolation)", () => {
  let brandId: string;
  let usRegionId: string;
  let inRegionId: string;
  let euRegionId: string;

  beforeAll(async () => {
    const brand = await prisma.brand.create({
      data: { name: `Test Isolation Brand ${Date.now()}`, slug: `test-isolation-brand-${Date.now()}` },
    });
    brandId = brand.id;

    const us = await prisma.region.findUniqueOrThrow({ where: { code: "US" } });
    const inRegion = await prisma.region.findUniqueOrThrow({ where: { code: "IN" } });
    const eu = await prisma.region.findUniqueOrThrow({ where: { code: "EU" } });
    usRegionId = us.id;
    inRegionId = inRegion.id;
    euRegionId = eu.id;

    await prisma.affiliateMapping.create({
      data: { brandId, regionId: usRegionId, url: "https://affiliate.example/test-brand/us", source: "ADMIN" },
    });
    await prisma.affiliateMapping.create({
      data: { brandId, regionId: inRegionId, url: "https://affiliate.example/test-brand/in", source: "ADMIN" },
    });
    // Deliberately no mapping created for EU.
  });

  afterAll(async () => {
    await prisma.affiliateMapping.deleteMany({ where: { brandId } });
    await prisma.brand.delete({ where: { id: brandId } });
  });

  it("resolves the US-specific URL for the US region", async () => {
    const resolved = await resolveAffiliateUrl(brandId, usRegionId);
    expect(resolved?.url).toBe("https://affiliate.example/test-brand/us");
    expect(resolved?.source).toBe("ADMIN");
  });

  it("resolves the IN-specific URL for the IN region, never the US one", async () => {
    const resolved = await resolveAffiliateUrl(brandId, inRegionId);
    expect(resolved?.url).toBe("https://affiliate.example/test-brand/in");
    expect(resolved?.url).not.toBe("https://affiliate.example/test-brand/us");
  });

  it("returns null (never a fabricated or cross-region URL) when no mapping exists", async () => {
    const resolved = await resolveAffiliateUrl(brandId, euRegionId);
    expect(resolved).toBeNull();
  });
});
