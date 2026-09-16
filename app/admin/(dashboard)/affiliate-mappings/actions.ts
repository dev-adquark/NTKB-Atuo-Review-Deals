"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth/guard";
import { logAudit } from "@/lib/audit";

export async function setAffiliateMappingAction(brandId: string, regionId: string, formData: FormData): Promise<void> {
  const session = await requireAdminApi();
  if (!session) throw new Error("Unauthorized");

  const url = String(formData.get("url") ?? "").trim();

  if (!url) {
    await prisma.affiliateMapping.deleteMany({ where: { brandId, regionId } });
    await logAudit({ userId: session.sub, action: "affiliate.mapping.removed", entityType: "AffiliateMapping", metadata: { brandId, regionId } });
    revalidatePath("/admin/affiliate-mappings");
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Affiliate URL must be a valid absolute URL.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Affiliate URL must use http or https.");
  }

  // Admin-entered mappings always win over any network-sourced mapping (spec rule 7).
  await prisma.affiliateMapping.upsert({
    where: { brandId_regionId: { brandId, regionId } },
    create: { brandId, regionId, url, source: "ADMIN", active: true },
    update: { url, source: "ADMIN", active: true },
  });

  await logAudit({ userId: session.sub, action: "affiliate.mapping.set", entityType: "AffiliateMapping", metadata: { brandId, regionId, url } });
  revalidatePath("/admin/affiliate-mappings");
}
