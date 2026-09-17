import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { hashPassword } from "../lib/auth/password";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Site scope is strictly US + Europe. AU/IN rows are kept (not deleted, to avoid
// breaking historical foreign-key references) but deactivated so they never
// appear in nav/footer/region discovery or resolve as a live route.
const REGIONS = [
  { code: "US" as const, name: "United States", language: "en-US", urlPrefix: "us", currency: "USD", active: true },
  { code: "EU" as const, name: "Europe", language: "en-GB", urlPrefix: "eu", currency: "EUR", active: true },
  { code: "AU" as const, name: "Australia", language: "en-AU", urlPrefix: "au", currency: "AUD", active: false },
  { code: "IN" as const, name: "India", language: "en-IN", urlPrefix: "in", currency: "INR", active: false },
];

async function main() {
  console.log("Seeding regions…");
  const regions = [];
  for (const region of REGIONS) {
    const row = await prisma.region.upsert({
      where: { code: region.code },
      create: region,
      update: { name: region.name, language: region.language, urlPrefix: region.urlPrefix, currency: region.currency, active: region.active },
    });
    regions.push(row);
  }
  const activeRegions = regions.filter((r) => r.active);

  console.log("Seeding admin user…");
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (email && password) {
    const passwordHash = await hashPassword(password);
    await prisma.adminUser.upsert({
      where: { email },
      create: { email, passwordHash, name: "Admin" },
      update: {},
    });
  } else {
    console.warn("ADMIN_BOOTSTRAP_EMAIL/ADMIN_BOOTSTRAP_PASSWORD not set — skipping admin user seed.");
  }

  console.log("Seeding sample brands…");
  const brandA = await prisma.brand.upsert({
    where: { slug: "pulsegear" },
    create: { name: "PulseGear", slug: "pulsegear", description: "Sample tech/electronics brand for demo/testing." },
    update: {},
  });
  const brandB = await prisma.brand.upsert({
    where: { slug: "stridewear" },
    create: { name: "StrideWear", slug: "stridewear", description: "Sample fashion brand for demo/testing." },
    update: {},
  });

  // Strict content scope: Tech Reviews, Electronics Reviews, Fashion Trends only,
  // across the two active regions (US, EU).
  const KEYWORDS = [
    { slug: "best-wireless-earbuds", text: "best wireless earbuds", pageType: "KEYWORD_REVIEW" as const, category: "Electronics", brandIds: (a: string) => [a] },
    { slug: "best-laptop-deals", text: "best laptop deals", pageType: "TOP_PICKS" as const, category: "Tech", brandIds: (a: string) => [a] },
    { slug: "best-running-shoes", text: "best running shoes", pageType: "KEYWORD_REVIEW" as const, category: "Fashion", brandIds: (_a: string, b: string) => [b] },
  ];

  console.log("Seeding rankings, affiliate mappings, and keywords per region…");
  for (const region of activeRegions) {
    await prisma.brandRanking.upsert({
      where: { brandId_regionId: { brandId: brandA.id, regionId: region.id } },
      create: { brandId: brandA.id, regionId: region.id, rank: 1 },
      update: { rank: 1 },
    });
    await prisma.brandRanking.upsert({
      where: { brandId_regionId: { brandId: brandB.id, regionId: region.id } },
      create: { brandId: brandB.id, regionId: region.id, rank: 2 },
      update: { rank: 2 },
    });

    await prisma.affiliateMapping.upsert({
      where: { brandId_regionId: { brandId: brandA.id, regionId: region.id } },
      create: { brandId: brandA.id, regionId: region.id, url: `https://affiliate.example/pulsegear?region=${region.code}`, source: "ADMIN" },
      update: {},
    });
    await prisma.affiliateMapping.upsert({
      where: { brandId_regionId: { brandId: brandB.id, regionId: region.id } },
      create: { brandId: brandB.id, regionId: region.id, url: `https://affiliate.example/stridewear?region=${region.code}`, source: "ADMIN" },
      update: {},
    });

    for (const [i, kw] of KEYWORDS.entries()) {
      const targetBrandIds = kw.brandIds(brandA.id, brandB.id);
      await prisma.keyword.upsert({
        where: { regionId_slug: { regionId: region.id, slug: kw.slug } },
        create: {
          text: kw.text,
          slug: kw.slug,
          regionId: region.id,
          pageType: kw.pageType,
          category: kw.category,
          priority: 10 - i,
          targetBrandIds,
        },
        update: { targetBrandIds },
      });
    }
  }

  // A distinct topic so the E2E generation test always starts with a fresh,
  // low-overlap uniqueness pool regardless of how many times the keywords above
  // have already been generated/published.
  console.log("Seeding E2E test keyword...");
  const usRegion = activeRegions.find((r) => r.code === "US")!;
  await prisma.keyword.upsert({
    where: { regionId_slug: { regionId: usRegion.id, slug: "best-budget-smartwatches" } },
    create: {
      text: "best budget smartwatches",
      slug: "best-budget-smartwatches",
      regionId: usRegion.id,
      pageType: "KEYWORD_REVIEW",
      category: "Electronics",
      priority: 1,
    },
    update: {},
  });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
