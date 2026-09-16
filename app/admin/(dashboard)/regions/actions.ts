"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth/guard";
import { logAudit } from "@/lib/audit";
import type { RegionCode } from "@/app/generated/prisma/client";

export async function createRegionAction(formData: FormData): Promise<void> {
  const session = await requireAdminApi();
  if (!session) throw new Error("Unauthorized");

  const code = String(formData.get("code")) as RegionCode;
  const name = String(formData.get("name") ?? "").trim();
  const language = String(formData.get("language") ?? "").trim();
  const urlPrefix = String(formData.get("urlPrefix") ?? "").trim().toLowerCase();
  const currency = String(formData.get("currency") ?? "").trim().toUpperCase();

  if (!code || !name || !language || !urlPrefix || !currency) {
    throw new Error("All region fields are required.");
  }

  const region = await prisma.region.create({ data: { code, name, language, urlPrefix, currency } });
  await logAudit({ userId: session.sub, action: "region.created", entityType: "Region", entityId: region.id });
  revalidatePath("/admin/regions");
}

export async function updateRegionAction(regionId: string, formData: FormData): Promise<void> {
  const session = await requireAdminApi();
  if (!session) throw new Error("Unauthorized");

  const name = String(formData.get("name") ?? "").trim();
  const language = String(formData.get("language") ?? "").trim();
  const urlPrefix = String(formData.get("urlPrefix") ?? "").trim().toLowerCase();
  const currency = String(formData.get("currency") ?? "").trim().toUpperCase();
  const active = formData.get("active") === "on";

  await prisma.region.update({
    where: { id: regionId },
    data: { name, language, urlPrefix, currency, active },
  });
  await logAudit({ userId: session.sub, action: "region.updated", entityType: "Region", entityId: regionId });
  revalidatePath("/admin/regions");
}
