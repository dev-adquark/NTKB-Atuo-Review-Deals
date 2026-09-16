"use server";

import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth/guard";
import { logAudit } from "@/lib/audit";
import { updateContentEngineConfig, getContentEngineRuntimeConfig } from "@/lib/content-engine/config";
import { testContentEngineConnection, type TestConnectionResult } from "@/lib/content-engine/test-connection";

export async function updateContentEngineSettingsAction(formData: FormData): Promise<void> {
  const session = await requireAdminApi();
  if (!session) throw new Error("Unauthorized");

  const apiKey = String(formData.get("apiKey") ?? "").trim();

  await updateContentEngineConfig({
    providerName: String(formData.get("providerName") ?? "").trim() || "Content Generation Engine",
    apiBaseUrl: String(formData.get("apiBaseUrl") ?? "").trim(),
    generationEndpoint: String(formData.get("generationEndpoint") ?? "").trim() || "/v1/generate",
    ...(apiKey ? { apiKey } : {}),
    authMethod: String(formData.get("authMethod") ?? "bearer"),
    apiVersion: String(formData.get("apiVersion") ?? "").trim() || null,
    timeoutMs: Number(formData.get("timeoutMs") ?? 30000) || 30000,
    retryCount: Number(formData.get("retryCount") ?? 2) || 0,
    mockMode: formData.get("mockMode") === "on",
    enabled: formData.get("enabled") === "on",
  });

  await logAudit({ userId: session.sub, action: "content-engine.config.updated", entityType: "ContentEngineConfig" });
  revalidatePath("/admin/content-engine");
}

export interface TestConnectionState {
  result?: TestConnectionResult;
}

export async function testConnectionAction(_prev: TestConnectionState): Promise<TestConnectionState> {
  const session = await requireAdminApi();
  if (!session) throw new Error("Unauthorized");

  const config = await getContentEngineRuntimeConfig();
  const result = await testContentEngineConnection(config);
  await logAudit({ userId: session.sub, action: "content-engine.test-connection", entityType: "ContentEngineConfig", metadata: { connected: result.connected, message: result.message } });
  return { result };
}
