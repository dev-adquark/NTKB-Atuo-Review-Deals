import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/guard";
import { publishGeneratedPage } from "@/lib/publishing/pipeline";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: RouteContext<"/api/pages/[id]/publish">) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const outcome = await publishGeneratedPage(id, session.sub);
  return NextResponse.json(outcome, { status: outcome.ok ? 200 : 422 });
}
