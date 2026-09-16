import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { hashPassword } from "../lib/auth/password";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const REGIONS = [
  { code: "US" as const, name: "United States", language: "en-US", urlPrefix: "us", currency: "USD" },
  { code: "EU" as const, name: "Europe", language: "en-GB", urlPrefix: "eu", currency: "EUR" },
  { code: "AU" as const, name: "Australia", language: "en-AU", urlPrefix: "au", currency: "AUD" },
  { code: "IN" as const, name: "India", language: "en-IN", urlPrefix: "in", currency: "INR" },
];

async function main() {
  console.log("Seeding regions…");
  const regions = [];
  for (const region of REGIONS) {
    const row = await prisma.region.upsert({
      where: { code: region.code },
      create: region,
      update: { name: region.name, language: region.language, urlPrefix: region.urlPrefix, currency: region.currency },
    });
    regions.push(row);
  }

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
    where: { slug: "exampleguard" },
    create: { name: "ExampleGuard", slug: "exampleguard", description: "Sample password manager brand for demo/testing." },
    update: {},
  });
  const brandB = await prisma.brand.upsert({
    where: { slug: "securevault" },
    create: { name: "SecureVault", slug: "securevault", description: "Sample password manager brand for demo/testing." },
    update: {},
  });

  console.log("Seeding rankings, affiliate mappings, and keywords per region…");
  for (const region of regions) {
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
      create: { brandId: brandA.id, regionId: region.id, url: `https://affiliate.example/exampleguard?region=${region.code}`, source: "ADMIN" },
      update: {},
    });
    await prisma.affiliateMapping.upsert({
      where: { brandId_regionId: { brandId: brandB.id, regionId: region.id } },
      create: { brandId: brandB.id, regionId: region.id, url: `https://affiliate.example/securevault?region=${region.code}`, source: "ADMIN" },
      update: {},
    });

    await prisma.keyword.upsert({
      where: { regionId_slug: { regionId: region.id, slug: "best-password-managers" } },
      create: {
        text: "best password managers",
        slug: "best-password-managers",
        regionId: region.id,
        pageType: "KEYWORD_REVIEW",
        category: "Software",
        priority: 10,
        targetBrandIds: [brandA.id, brandB.id],
      },
      update: { targetBrandIds: [brandA.id, brandB.id] },
    });

    await prisma.keyword.upsert({
      where: { regionId_slug: { regionId: region.id, slug: "best-password-manager-deals" } },
      create: {
        text: "best password manager deals",
        slug: "best-password-manager-deals",
        regionId: region.id,
        pageType: "TOP_PICKS",
        category: "Software",
        priority: 5,
        targetBrandIds: [brandA.id, brandB.id],
      },
      update: { targetBrandIds: [brandA.id, brandB.id] },
    });
  }

  // A distinct topic (not "password managers") so the E2E generation test always
  // starts with a fresh, low-overlap uniqueness pool regardless of how many times
  // the password-manager keywords above have already been generated/published.
  console.log("Seeding E2E test keyword...");
  const usRegion = regions.find((r) => r.code === "US")!;
  await prisma.keyword.upsert({
    where: { regionId_slug: { regionId: usRegion.id, slug: "best-noise-cancelling-headphones" } },
    create: {
      text: "best noise cancelling headphones",
      slug: "best-noise-cancelling-headphones",
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
