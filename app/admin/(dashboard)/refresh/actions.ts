"use server";

import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth/guard";
import { getRefreshEligiblePages, refreshPage } from "@/lib/publishing/refresh";
import { getOrCreatePlatformSettings } from "@/lib/settings";
import { runWithConcurrency } from "@/lib/concurrency";

export interface RefreshState {
  summary?: { checked: number; succeeded: number; failed: number };
}

export async function refreshEligiblePagesAction(_prev: RefreshState): Promise<RefreshState> {
  const session = await requireAdminApi();
  if (!session) return {};

  const settings = await getOrCreatePlatformSettings();
  const eligible = await getRefreshEligiblePages(settings.batchSize);
  const results = await runWithConcurrency(eligible, settings.maxConcurrency, (page) => refreshPage(page.id, session.sub));
  const succeeded = results.filter((r) => r.result?.refreshed).length;

  revalidatePath("/admin/refresh");
  revalidatePath("/admin/pages");
  return { summary: { checked: eligible.length, succeeded, failed: eligible.length - succeeded } };
}

export async function refreshSinglePageAction(pageId: string): Promise<void> {
  const session = await requireAdminApi();
  if (!session) throw new Error("Unauthorized");
  await refreshPage(pageId, session.sub);
  revalidatePath("/admin/refresh");
  revalidatePath("/admin/pages");
}
