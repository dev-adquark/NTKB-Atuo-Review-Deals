"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth/guard";
import { runGeneration } from "@/lib/publishing/pipeline";
import { runWithConcurrency } from "@/lib/concurrency";
import { getOrCreatePlatformSettings } from "@/lib/settings";
import type { PageType } from "@/app/generated/prisma/client";

export interface GenerationFormState {
  error?: string;
}

export async function triggerGenerationAction(_prev: GenerationFormState, formData: FormData): Promise<GenerationFormState> {
  const session = await requireAdminApi();
  if (!session) return { error: "Unauthorized" };

  const regionId = String(formData.get("regionId") ?? "");
  const pageType = String(formData.get("pageType") ?? "") as PageType;
  const keywordId = String(formData.get("keywordId") ?? "") || null;
  const brandId = String(formData.get("brandId") ?? "") || null;

  if (!regionId || !pageType) {
    return { error: "Region and page type are required." };
  }
  if (pageType === "BRAND_REVIEW" && !brandId) {
    return { error: "Brand Review requires a brand." };
  }
  if (pageType !== "BRAND_REVIEW" && !keywordId) {
    return { error: "This page type requires a keyword." };
  }

  const outcome = await runGeneration({ regionId, pageType, keywordId, brandId, userId: session.sub });

  if (outcome.blocked === "DAILY_LIMIT_REACHED") {
    return { error: "Daily generation limit reached. Adjust it in Settings or try again tomorrow." };
  }
  if (!outcome.pageId) {
    return { error: outcome.errorMessage ?? "Generation failed." };
  }

  redirect(`/admin/pages/${outcome.pageId}`);
}

export interface BatchGenerationState {
  error?: string;
  summary?: { total: number; succeeded: number; failed: number };
}

/**
 * Runs one independent GenerationJob per selected keyword (spec section 43): a
 * failure for one keyword never hides or blocks the others. Respects the
 * configured concurrency limit and the shared daily generation limit (each call
 * re-checks it, so a batch stops creating new jobs once the limit is hit rather
 * than bypassing it).
 */
export async function triggerBatchGenerationAction(_prev: BatchGenerationState, formData: FormData): Promise<BatchGenerationState> {
  const session = await requireAdminApi();
  if (!session) return { error: "Unauthorized" };

  const regionId = String(formData.get("regionId") ?? "");
  const pageType = String(formData.get("pageType") ?? "") as PageType;
  const keywordIds = formData.getAll("keywordIds").map(String);

  if (!regionId || !pageType) {
    return { error: "Region and page type are required." };
  }
  if (keywordIds.length === 0) {
    return { error: "Select at least one keyword for batch generation." };
  }

  const settings = await getOrCreatePlatformSettings();
  const results = await runWithConcurrency(keywordIds, settings.maxConcurrency, (keywordId) =>
    runGeneration({ regionId, pageType, keywordId, brandId: null, userId: session.sub }),
  );

  const succeeded = results.filter((r) => r.result?.ok).length;
  revalidatePath("/admin/generation");

  return { summary: { total: results.length, succeeded, failed: results.length - succeeded } };
}
