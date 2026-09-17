import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { resolveAffiliateUrl } from "@/lib/affiliate/resolver";

export const dynamic = "force-dynamic";

/**
 * Outbound affiliate click redirect. The destination is never taken from the
 * request — it's resolved server-side, fresh, from the page's region and this
 * brandId via resolveAffiliateUrl(), which already refuses to return a
 * placeholder/example destination (lib/affiliate/url-safety.ts) and always
 * prefers the current admin-configured mapping. This also means the actual
 * destination is never exposed in a link's href for a visitor to see.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/click/[brandId]">) {
  const { brandId } = await params;
  const pageId = request.nextUrl.searchParams.get("page");

  if (!pageId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const page = await prisma.generatedPage.findUnique({ where: { id: pageId }, select: { regionId: true } });
  if (!page) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const resolved = await resolveAffiliateUrl(brandId, page.regionId);
  if (!resolved) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  await logAudit({
    action: "affiliate.click",
    entityType: "AffiliateMapping",
    entityId: brandId,
    metadata: { pageId, regionId: page.regionId, brandId },
  });

  return NextResponse.redirect(resolved.url, { status: 302 });
}
