import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/guard";
import { retryGscSubmission } from "@/lib/gsc/submit";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: RouteContext<"/api/gsc/[id]/retry">) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const submission = await retryGscSubmission(id, session.sub);
    return NextResponse.json(submission);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Retry failed." }, { status: 400 });
  }
}
