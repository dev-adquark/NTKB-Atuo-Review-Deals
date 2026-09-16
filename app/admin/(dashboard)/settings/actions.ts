"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth/guard";
import { logAudit } from "@/lib/audit";
import { getOrCreatePlatformSettings } from "@/lib/settings";

export async function updatePlatformSettingsAction(formData: FormData): Promise<void> {
  const session = await requireAdminApi();
  if (!session) throw new Error("Unauthorized");

  await getOrCreatePlatformSettings();

  await prisma.platformSettings.update({
    where: { id: "singleton" },
    data: {
      uniquenessMinScore: Number(formData.get("uniquenessMinScore") ?? 0.6),
      maxRepeatedSectionPct: Number(formData.get("maxRepeatedSectionPct") ?? 0.5),
      batchSize: Number(formData.get("batchSize") ?? 10),
      maxConcurrency: Number(formData.get("maxConcurrency") ?? 2),
      dailyGenerationLimit: Number(formData.get("dailyGenerationLimit") ?? 50),
      maxGscRetries: Number(formData.get("maxGscRetries") ?? 5),
      refreshEligibleDays: Number(formData.get("refreshEligibleDays") ?? 90),
      autoPublish: formData.get("autoPublish") === "on",
      requireAffiliateMapping: formData.get("requireAffiliateMapping") === "on",
      networkFallbackEnabled: formData.get("networkFallbackEnabled") === "on",
      gscHardGate: formData.get("gscHardGate") === "on",
      refreshEnabled: formData.get("refreshEnabled") === "on",
    },
  });

  await logAudit({ userId: session.sub, action: "settings.updated", entityType: "PlatformSettings" });
  revalidatePath("/admin/settings");
}
