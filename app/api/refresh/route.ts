import { NextResponse, type NextRequest } from "next/server";
import { getRefreshEligiblePages, refreshPage } from "@/lib/publishing/refresh";
import { getOrCreatePlatformSettings } from "@/lib/settings";
import { runWithConcurrency } from "@/lib/concurrency";

export const dynamic = "force-dynamic";

/**
 * Scheduled content-freshness refresh (spec section 11/121). Intended to be
 * triggered by an external scheduler (e.g. Vercel Cron) hitting this route on a
 * schedule — not by end-user traffic, hence the shared-secret header instead of
 * admin session auth. A refresh never takes a good published page down: see
 * lib/publishing/refresh.ts.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CONTENT_REFRESH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CONTENT_REFRESH_SECRET is not configured; refresh endpoint is disabled." }, { status: 503 });
  }
  if (request.headers.get("x-refresh-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getOrCreatePlatformSettings();
  if (!settings.refreshEnabled) {
    return NextResponse.json({ skipped: true, reason: "Scheduled refresh is disabled in Admin → Settings." });
  }

  const eligible = await getRefreshEligiblePages(settings.batchSize);
  const results = await runWithConcurrency(eligible, settings.maxConcurrency, (page) => refreshPage(page.id, null));

  const succeeded = results.filter((r) => r.result?.refreshed).length;
  return NextResponse.json({
    checked: eligible.length,
    succeeded,
    failed: eligible.length - succeeded,
    results: results.map((r) => r.result),
  });
}
