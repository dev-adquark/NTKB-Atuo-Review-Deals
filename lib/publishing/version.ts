import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import type { PageType } from "@/app/generated/prisma/client";

export function computeContentHash(content: unknown): string {
  const stable = JSON.stringify(content, Object.keys(content as Record<string, unknown>).sort());
  return createHash("sha256").update(stable).digest("hex");
}

export async function getNextVersion(params: {
  regionId: string;
  pageType: PageType;
  keywordId?: string | null;
  brandId?: string | null;
}): Promise<number> {
  const latest = await prisma.generatedPage.findFirst({
    where: {
      regionId: params.regionId,
      pageType: params.pageType,
      keywordId: params.keywordId ?? null,
      brandId: params.brandId ?? null,
    },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  return (latest?.version ?? 0) + 1;
}
