"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth/guard";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/seo/slug";

export async function createBrandAction(formData: FormData): Promise<void> {
  const session = await requireAdminApi();
  if (!session) throw new Error("Unauthorized");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Brand name is required.");
  const slug = slugify(String(formData.get("slug") ?? "") || name);
  const description = String(formData.get("description") ?? "").trim() || null;
  const logoUrl = String(formData.get("logoUrl") ?? "").trim() || null;

  const brand = await prisma.brand.create({ data: { name, slug, description, logoUrl } });
  await logAudit({ userId: session.sub, action: "brand.created", entityType: "Brand", entityId: brand.id });
  revalidatePath("/admin/brands");
}

export async function updateBrandAction(brandId: string, formData: FormData): Promise<void> {
  const session = await requireAdminApi();
  if (!session) throw new Error("Unauthorized");

  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? "") || name);
  const description = String(formData.get("description") ?? "").trim() || null;
  const logoUrl = String(formData.get("logoUrl") ?? "").trim() || null;

  await prisma.brand.update({ where: { id: brandId }, data: { name, slug, description, logoUrl } });
  await logAudit({ userId: session.sub, action: "brand.updated", entityType: "Brand", entityId: brandId });
  revalidatePath("/admin/brands");
  revalidatePath(`/admin/brands/${brandId}`);
}

export async function setBrandRankingAction(brandId: string, regionId: string, formData: FormData): Promise<void> {
  const session = await requireAdminApi();
  if (!session) throw new Error("Unauthorized");

  const rankRaw = String(formData.get("rank") ?? "").trim();

  if (!rankRaw) {
    await prisma.brandRanking.deleteMany({ where: { brandId, regionId } });
  } else {
    const rank = Number(rankRaw);
    if (!Number.isInteger(rank) || rank < 1) throw new Error("Rank must be a positive integer.");
    await prisma.brandRanking.upsert({
      where: { brandId_regionId: { brandId, regionId } },
      create: { brandId, regionId, rank },
      update: { rank },
    });
  }

  await logAudit({ userId: session.sub, action: "brand.ranking.updated", entityType: "Brand", entityId: brandId, metadata: { regionId, rank: rankRaw || null } });
  revalidatePath(`/admin/brands/${brandId}`);
}
