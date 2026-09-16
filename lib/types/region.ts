import type { RegionCode } from "@/app/generated/prisma/client";

export const REGION_CODES: RegionCode[] = ["US", "EU", "AU", "IN"];

export function isRegionCode(value: string): value is RegionCode {
  return (REGION_CODES as string[]).includes(value);
}
