import "server-only";
import { prisma } from "@/lib/db";
import type { PlatformSettings } from "@/app/generated/prisma/client";

const SINGLETON_ID = "singleton";

export async function getOrCreatePlatformSettings(): Promise<PlatformSettings> {
  const existing = await prisma.platformSettings.findUnique({ where: { id: SINGLETON_ID } });
  if (existing) return existing;
  return prisma.platformSettings.create({ data: { id: SINGLETON_ID } });
}
