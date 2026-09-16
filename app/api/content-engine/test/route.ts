import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/guard";
import { getContentEngineRuntimeConfig } from "@/lib/content-engine/config";
import { testContentEngineConnection } from "@/lib/content-engine/test-connection";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getContentEngineRuntimeConfig();
  const result = await testContentEngineConnection(config);
  return NextResponse.json(result);
}
