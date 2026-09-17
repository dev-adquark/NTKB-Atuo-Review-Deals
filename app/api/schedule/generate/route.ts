import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getContentEngineRuntimeConfig } from "@/lib/content-engine/config";
import { runGeneration, publishGeneratedPage } from "@/lib/publishing/pipeline";
import type { Prisma } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

/**
 * Scheduled new-content generation — one keyword, once per invocation. Triggered
 * by Vercel Cron per vercel.json, which always sends a GET and (when CRON_SECRET
 * is configured) an `Authorization: Bearer <CRON_SECRET>` header automatically —
 * this is Vercel's own documented convention, not a custom scheme.
 *
 * Picks the least-recently-attempted ACTIVE keyword and runs it through the
 * exact same generate -> validate -> repair -> validate -> publish pipeline
 * used everywhere else in NTKB (lib/publishing/pipeline.ts) — nothing about
 * that pipeline is duplicated or reimplemented here. A failed or unpublishable
 * result is logged and reported; it never gets forced to PUBLISHED. Vercel
 * does not retry a failed cron invocation, so this never spins into a retry
 * loop on its own.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured; scheduled generation is disabled." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const engineConfig = await getContentEngineRuntimeConfig();
  if (!engineConfig.enabled) {
    return NextResponse.json({ skipped: true, reason: "Content Engine is disabled in Admin -> Content Engine settings." });
  }

  // Least-recently-attempted ACTIVE keyword, across whatever categories/regions
  // are currently configured active — never hardcoded here, so archiving a
  // keyword or deactivating a region (as already happened this session)
  // automatically removes it from rotation with no code change.
  const activeKeywords = await prisma.keyword.findMany({
    where: { status: "ACTIVE", region: { active: true } },
    select: { id: true, text: true, regionId: true, pageType: true },
  });
  if (activeKeywords.length === 0) {
    return NextResponse.json({ skipped: true, reason: "No active keywords are configured." });
  }

  const lastAttempts = await prisma.generationJob.groupBy({
    by: ["keywordId"],
    where: { keywordId: { in: activeKeywords.map((k) => k.id) } },
    _max: { createdAt: true },
  });
  const lastAttemptByKeyword = new Map(lastAttempts.map((a) => [a.keywordId, a._max.createdAt]));
  const [next] = [...activeKeywords].sort((a, b) => {
    const aTime = lastAttemptByKeyword.get(a.id)?.getTime() ?? 0;
    const bTime = lastAttemptByKeyword.get(b.id)?.getTime() ?? 0;
    return aTime - bTime;
  });

  const outcome = await runGeneration({
    regionId: next.regionId,
    pageType: next.pageType,
    keywordId: next.id,
    userId: null,
  });

  const base = { keywordId: next.id, keywordText: next.text, jobId: outcome.jobId };

  if (outcome.blocked) {
    await logAudit({ userId: null, action: "scheduled.generation.blocked", entityType: "GenerationJob", entityId: outcome.jobId ?? next.id, metadata: { ...base, blocked: outcome.blocked } });
    return NextResponse.json({ status: "blocked", ...base, blocked: outcome.blocked });
  }

  if (!outcome.pageId) {
    await logAudit({ userId: null, action: "scheduled.generation.failed", entityType: "GenerationJob", entityId: outcome.jobId ?? next.id, metadata: { ...base, errorMessage: outcome.errorMessage } });
    return NextResponse.json({ status: "generation_failed", ...base, errorMessage: outcome.errorMessage });
  }

  if (!outcome.ok) {
    await logAudit({
      userId: null,
      action: "scheduled.generation.rejected",
      entityType: "GeneratedPage",
      entityId: outcome.pageId,
      metadata: { ...base, pageId: outcome.pageId, issues: outcome.issues } as unknown as Prisma.InputJsonValue,
    });
    return NextResponse.json({ status: "validation_failed", ...base, pageId: outcome.pageId, issues: outcome.issues });
  }

  const publish = await publishGeneratedPage(outcome.pageId, null);
  if (!publish.ok) {
    await logAudit({
      userId: null,
      action: "scheduled.publish.rejected",
      entityType: "GeneratedPage",
      entityId: outcome.pageId,
      metadata: { ...base, pageId: outcome.pageId, gates: publish.gates } as unknown as Prisma.InputJsonValue,
    });
    return NextResponse.json({ status: "publish_gates_failed", ...base, pageId: outcome.pageId, gates: publish.gates });
  }

  await logAudit({ userId: null, action: "scheduled.publish.succeeded", entityType: "GeneratedPage", entityId: outcome.pageId, metadata: base });
  return NextResponse.json({ status: "published", ...base, pageId: outcome.pageId });
}
