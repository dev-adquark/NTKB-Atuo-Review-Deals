"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth/guard";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/seo/slug";
import type { KeywordStatus, PageType } from "@/app/generated/prisma/client";

export async function createKeywordAction(formData: FormData): Promise<void> {
  const session = await requireAdminApi();
  if (!session) throw new Error("Unauthorized");

  const text = String(formData.get("text") ?? "").trim();
  const regionId = String(formData.get("regionId") ?? "");
  const pageType = String(formData.get("pageType") ?? "") as PageType;
  const category = String(formData.get("category") ?? "").trim() || null;
  const priority = Number(formData.get("priority") ?? 0) || 0;
  const targetBrandIds = formData.getAll("targetBrandIds").map(String);

  if (!text || !regionId || !pageType) {
    throw new Error("Keyword text, region, and page type are required.");
  }

  const slug = slugify(text);
  const keyword = await prisma.keyword.create({
    data: { text, slug, regionId, pageType, category, priority, targetBrandIds },
  });
  await logAudit({ userId: session.sub, action: "keyword.created", entityType: "Keyword", entityId: keyword.id });
  revalidatePath("/admin/keywords");
}

export async function updateKeywordStatusAction(keywordId: string, formData: FormData): Promise<void> {
  const session = await requireAdminApi();
  if (!session) throw new Error("Unauthorized");

  const status = String(formData.get("status") ?? "") as KeywordStatus;
  await prisma.keyword.update({ where: { id: keywordId }, data: { status } });
  await logAudit({ userId: session.sub, action: "keyword.status.updated", entityType: "Keyword", entityId: keywordId, metadata: { status } });
  revalidatePath("/admin/keywords");
}
