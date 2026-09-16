"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth/guard";
import { logAudit } from "@/lib/audit";
import { DEFAULT_SPONSORED_LABEL } from "@/lib/validation/disclosure";

export async function createSponsoredPlacementAction(formData: FormData): Promise<void> {
  const session = await requireAdminApi();
  if (!session) throw new Error("Unauthorized");

  const sponsorName = String(formData.get("sponsorName") ?? "").trim();
  const brandId = String(formData.get("brandId") ?? "");
  const regionId = String(formData.get("regionId") ?? "");
  const link = String(formData.get("link") ?? "").trim();
  const disclosure = String(formData.get("disclosure") ?? "").trim();
  const sponsorLabel = String(formData.get("sponsorLabel") ?? "").trim() || DEFAULT_SPONSORED_LABEL;
  const ctaLabel = String(formData.get("ctaLabel") ?? "").trim() || null;
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const startDate = new Date(String(formData.get("startDate") ?? ""));
  const endDate = new Date(String(formData.get("endDate") ?? ""));

  if (!sponsorName || !brandId || !regionId || !link || !disclosure) {
    throw new Error("Sponsor name, brand, region, link, and disclosure are required.");
  }
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    throw new Error("A valid start and end date are required, with end on or after start.");
  }

  const placement = await prisma.sponsoredPlacement.create({
    data: { sponsorName, sponsorLabel, disclosure, brandId, regionId, link, ctaLabel, imageUrl, startDate, endDate },
  });
  await logAudit({ userId: session.sub, action: "sponsored.created", entityType: "SponsoredPlacement", entityId: placement.id });
  revalidatePath("/admin/sponsored");
}

export async function toggleSponsoredPlacementAction(placementId: string, formData: FormData): Promise<void> {
  const session = await requireAdminApi();
  if (!session) throw new Error("Unauthorized");

  const active = formData.get("active") === "on";
  await prisma.sponsoredPlacement.update({ where: { id: placementId }, data: { active } });
  await logAudit({ userId: session.sub, action: "sponsored.toggled", entityType: "SponsoredPlacement", entityId: placementId, metadata: { active } });
  revalidatePath("/admin/sponsored");
}
