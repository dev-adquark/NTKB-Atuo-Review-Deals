"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth/guard";
import { publishGeneratedPage, unpublishGeneratedPage, runGeneration } from "@/lib/publishing/pipeline";

export interface PublishState {
  error?: string;
  gates?: Array<{ key: string; label: string; passed: boolean; detail?: string }>;
}

export async function publishPageAction(pageId: string, _prev: PublishState): Promise<PublishState> {
  const session = await requireAdminApi();
  if (!session) return { error: "Unauthorized" };

  const outcome = await publishGeneratedPage(pageId, session.sub);
  revalidatePath(`/admin/pages/${pageId}`);
  revalidatePath("/admin/pages");
  if (!outcome.ok) {
    return { error: "One or more publish gates failed.", gates: outcome.gates };
  }
  return { gates: outcome.gates };
}

export async function unpublishPageAction(pageId: string): Promise<void> {
  const session = await requireAdminApi();
  if (!session) throw new Error("Unauthorized");
  await unpublishGeneratedPage(pageId, session.sub);
  revalidatePath(`/admin/pages/${pageId}`);
  revalidatePath("/admin/pages");
}

export async function regeneratePageAction(pageId: string): Promise<void> {
  const session = await requireAdminApi();
  if (!session) throw new Error("Unauthorized");

  const page = await prisma.generatedPage.findUniqueOrThrow({ where: { id: pageId } });
  const outcome = await runGeneration({
    regionId: page.regionId,
    pageType: page.pageType,
    keywordId: page.keywordId,
    brandId: page.brandId,
    userId: session.sub,
  });
  revalidatePath("/admin/pages");
  if (!outcome.pageId) {
    // Generation itself failed outright (e.g. content engine error) — nothing to
    // navigate to; the admin stays on the current (old) version.
    return;
  }
  redirect(`/admin/pages/${outcome.pageId}`);
}
