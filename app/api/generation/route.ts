import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/auth/guard";
import { runGeneration } from "@/lib/publishing/pipeline";
import type { PageType } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

interface GenerationRequestBody {
  regionId?: string;
  pageType?: PageType;
  keywordId?: string;
  brandId?: string;
}

export async function POST(request: NextRequest) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as GenerationRequestBody;
  if (!body.regionId || !body.pageType) {
    return NextResponse.json({ error: "regionId and pageType are required." }, { status: 400 });
  }

  const outcome = await runGeneration({
    regionId: body.regionId,
    pageType: body.pageType,
    keywordId: body.keywordId ?? null,
    brandId: body.brandId ?? null,
    userId: session.sub,
  });

  if (outcome.blocked) {
    return NextResponse.json({ error: outcome.blocked }, { status: 429 });
  }

  return NextResponse.json(outcome, { status: outcome.ok ? 200 : 422 });
}
