import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./app/generated/prisma/client";
import { runGeneration, publishGeneratedPage } from "./lib/publishing/pipeline";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  console.log("Waiting 65s...");
  await new Promise((r) => setTimeout(r, 65000));

  const admin = await prisma.adminUser.findFirstOrThrow();
  const us = await prisma.region.findUniqueOrThrow({ where: { code: "US" } });
  const keyword = await prisma.keyword.findUniqueOrThrow({ where: { regionId_slug: { regionId: us.id, slug: "best-wireless-earbuds" } } });

  console.log("Calling the REAL Content Engine API for:", keyword.text, "/", us.code);
  const outcome = await runGeneration({
    regionId: us.id,
    pageType: "KEYWORD_REVIEW",
    keywordId: keyword.id,
    userId: admin.id,
  });

  console.log("Generation outcome:", JSON.stringify({ ok: outcome.ok, jobId: outcome.jobId, pageId: outcome.pageId, errorMessage: outcome.errorMessage, issues: outcome.issues, blocked: outcome.blocked }, null, 2));

  if (!outcome.pageId) {
    console.log("No page was created — stopping. Nothing published.");
    return;
  }

  const page = await prisma.generatedPage.findUniqueOrThrow({ where: { id: outcome.pageId } });
  console.log("Page status after generation:", page.status, "uniquenessScore:", page.uniquenessScore);

  if (!outcome.ok) {
    console.log("Generation did not pass structural validation — will NOT publish. Issues:", JSON.stringify(outcome.issues));
    return;
  }

  const publish = await publishGeneratedPage(outcome.pageId, admin.id);
  console.log("Publish outcome:", JSON.stringify({ ok: publish.ok, gates: publish.gates }, null, 2));

  if (publish.ok) {
    const published = await prisma.generatedPage.findUniqueOrThrow({ where: { id: outcome.pageId } });
    console.log("PUBLISHED:", JSON.stringify({ title: published.title, canonicalPath: published.canonicalPath, status: published.status }));
  } else {
    console.log("Publish gates failed — page remains unpublished (correctly not live).");
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
