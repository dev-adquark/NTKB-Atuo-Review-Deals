import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: RouteContext<"/api/generation/[id]">) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const job = await prisma.generationJob.findUnique({
    where: { id },
    include: { generatedPages: { select: { id: true, status: true, version: true } } },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(job);
}
