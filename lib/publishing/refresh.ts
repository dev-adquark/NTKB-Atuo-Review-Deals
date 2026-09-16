import "server-only";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { runGeneration, publishGeneratedPage } from "./pipeline";
import { getOrCreatePlatformSettings } from "@/lib/settings";
import type { Prisma } from "@/app/generated/prisma/client";

/**
 * Pages eligible for a scheduled/manual freshness refresh: currently published,
 * older than the configured threshold, and not attempted again within the last
 * day (so a failing page isn't retried every single cron tick).
 */
export async function getRefreshEligiblePages(limit = 20) {
  const settings = await getOrCreatePlatformSettings();
  const cutoff = new Date(Date.now() - settings.refreshEligibleDays * 24 * 60 * 60 * 1000);
  const attemptCooldown = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return prisma.generatedPage.findMany({
    where: {
      status: "PUBLISHED",
      isCurrent: true,
      publishedAt: { lt: cutoff },
      OR: [{ lastRefreshAttemptAt: null }, { lastRefreshAttemptAt: { lt: attemptCooldown } }],
    },
    include: { region: true, keyword: true, brand: true },
    orderBy: { publishedAt: "asc" },
    take: limit,
  });
}

export interface RefreshOutcome {
  pageId: string;
  refreshed: boolean;
  reason?: string;
}

/**
 * Refreshes a single published page: generate → validate → publish only if every
 * gate passes. On any failure, the currently live page is left untouched and
 * still serving — a refresh must never take a good page down (spec section 11).
 */
export async function refreshPage(pageId: string, userId: string | null): Promise<RefreshOutcome> {
  const page = await prisma.generatedPage.findUniqueOrThrow({ where: { id: pageId } });

  await prisma.generatedPage.update({ where: { id: pageId }, data: { lastRefreshAttemptAt: new Date() } });
  await logAudit({ userId, action: "refresh.attempted", entityType: "GeneratedPage", entityId: pageId });

  const outcome = await runGeneration({
    regionId: page.regionId,
    pageType: page.pageType,
    keywordId: page.keywordId,
    brandId: page.brandId,
    userId,
  });

  if (!outcome.pageId || !outcome.ok) {
    await logAudit({
      userId,
      action: "refresh.failed",
      entityType: "GeneratedPage",
      entityId: pageId,
      metadata: { reason: outcome.errorMessage ?? "validation failed", issues: outcome.issues } as unknown as Prisma.InputJsonValue,
    });
    return { pageId, refreshed: false, reason: outcome.errorMessage ?? "New version failed validation." };
  }

  const publishOutcome = await publishGeneratedPage(outcome.pageId, userId);
  if (!publishOutcome.ok) {
    await logAudit({
      userId,
      action: "refresh.failed",
      entityType: "GeneratedPage",
      entityId: pageId,
      metadata: { reason: "publish gates failed", gates: publishOutcome.gates.filter((g) => !g.passed) } as unknown as Prisma.InputJsonValue,
    });
    return { pageId, refreshed: false, reason: "New version failed publish gates." };
  }

  await logAudit({ userId, action: "refresh.succeeded", entityType: "GeneratedPage", entityId: outcome.pageId });
  return { pageId: outcome.pageId, refreshed: true };
}
