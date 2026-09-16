import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Outbound affiliate click redirect. The destination must exactly match an active,
 * admin-configured affiliate mapping for this brand — this prevents the endpoint from
 * being used as an open redirect to an arbitrary URL.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/click/[brandId]">) {
  const { brandId } = await params;
  const destination = request.nextUrl.searchParams.get("destination");
  const pageId = request.nextUrl.searchParams.get("page");

  if (!destination) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const mapping = await prisma.affiliateMapping.findFirst({
    where: { brandId, url: destination, active: true },
  });

  if (!mapping) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  await logAudit({
    action: "affiliate.click",
    entityType: "AffiliateMapping",
    entityId: mapping.id,
    metadata: { pageId, regionId: mapping.regionId, brandId },
  });

  return NextResponse.redirect(mapping.url, { status: 302 });
}
