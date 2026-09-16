import "server-only";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getOrCreatePlatformSettings } from "@/lib/settings";
import { submitUrlToGsc } from "./client";
import type { GSCSubmission, Prisma } from "@/app/generated/prisma/client";

export async function queueGscSubmission(generatedPageId: string, url: string): Promise<GSCSubmission> {
  return prisma.gSCSubmission.create({
    data: { generatedPageId, url, status: "QUEUED" },
  });
}

export async function processGscSubmission(submissionId: string): Promise<GSCSubmission> {
  const result = await submitUrlToGsc((await prisma.gSCSubmission.findUniqueOrThrow({ where: { id: submissionId } })).url);

  const submission = await prisma.gSCSubmission.update({
    where: { id: submissionId },
    data: {
      status: result.ok ? "SUCCESS" : "FAILED",
      submittedAt: new Date(),
      response: (result.response ?? null) as Prisma.InputJsonValue,
      error: result.error ?? null,
    },
  });

  await logAudit({
    action: result.ok ? "gsc.submission.success" : "gsc.submission.failed",
    entityType: "GSCSubmission",
    entityId: submissionId,
    metadata: { url: submission.url, error: result.error } as unknown as Prisma.InputJsonValue,
  });

  return submission;
}

export async function retryGscSubmission(submissionId: string, userId: string | null): Promise<GSCSubmission> {
  const settings = await getOrCreatePlatformSettings();
  const existing = await prisma.gSCSubmission.findUniqueOrThrow({ where: { id: submissionId } });

  if (existing.retryCount >= settings.maxGscRetries) {
    throw new Error(`Retry limit (${settings.maxGscRetries}) reached for this submission.`);
  }

  await prisma.gSCSubmission.update({
    where: { id: submissionId },
    data: { retryCount: { increment: 1 }, status: "QUEUED" },
  });

  const result = await processGscSubmission(submissionId);
  await logAudit({ userId, action: "gsc.submission.retried", entityType: "GSCSubmission", entityId: submissionId });
  return result;
}
