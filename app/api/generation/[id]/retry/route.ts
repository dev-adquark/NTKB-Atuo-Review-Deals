import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { runGeneration } from "@/lib/publishing/pipeline";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: RouteContext<"/api/generation/[id]/retry">) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const job = await prisma.generationJob.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const outcome = await runGeneration({
    regionId: job.regionId,
    pageType: job.pageType,
    keywordId: job.keywordId,
    brandId: job.brandId,
    userId: session.sub,
  });

  return NextResponse.json(outcome, { status: outcome.ok ? 200 : 422 });
}
