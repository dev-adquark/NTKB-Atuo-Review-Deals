"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth/guard";
import { retryGscSubmission } from "@/lib/gsc/submit";
import { runWithConcurrency } from "@/lib/concurrency";
import { getOrCreatePlatformSettings } from "@/lib/settings";

export async function retryGscSubmissionAction(submissionId: string): Promise<void> {
  const session = await requireAdminApi();
  if (!session) throw new Error("Unauthorized");

  await retryGscSubmission(submissionId, session.sub);
  revalidatePath("/admin/gsc");
  revalidatePath("/admin/pages");
}

/** Retries only currently-FAILED submissions (spec section 36) — never an unlimited
 * automatic retry sweep, and each submission still respects its own retry-count cap. */
export async function retryAllFailedGscSubmissionsAction(): Promise<void> {
  const session = await requireAdminApi();
  if (!session) throw new Error("Unauthorized");

  const settings = await getOrCreatePlatformSettings();
  const failed = await prisma.gSCSubmission.findMany({
    where: { status: "FAILED", retryCount: { lt: settings.maxGscRetries } },
    select: { id: true },
  });

  await runWithConcurrency(failed, settings.maxConcurrency, (submission) => retryGscSubmission(submission.id, session.sub));

  revalidatePath("/admin/gsc");
  revalidatePath("/admin/pages");
}
