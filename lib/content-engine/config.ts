import "server-only";
import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/crypto";
import type { ContentEngineRuntimeConfig } from "./types";
import { Prisma, type ContentEngineConfig } from "@/app/generated/prisma/client";

const SINGLETON_ID = "singleton";

/** Creates the config row from env vars on first access; afterwards the DB row is authoritative. */
export async function getOrCreateContentEngineConfigRow(): Promise<ContentEngineConfig> {
  const existing = await prisma.contentEngineConfig.findUnique({ where: { id: SINGLETON_ID } });
  if (existing) return existing;

  const envApiKey = process.env.CONTENT_ENGINE_API_KEY;
  return prisma.contentEngineConfig.create({
    data: {
      id: SINGLETON_ID,
      apiBaseUrl: process.env.CONTENT_ENGINE_API_BASE_URL ?? "",
      generationEndpoint: process.env.CONTENT_ENGINE_API_ENDPOINT ?? "/v1/generate",
      apiKeyEncrypted: envApiKey ? encryptSecret(envApiKey) : null,
      mockMode: (process.env.CONTENT_ENGINE_MOCK_MODE ?? "true").toLowerCase() !== "false",
      enabled: (process.env.CONTENT_ENGINE_MOCK_MODE ?? "true").toLowerCase() !== "false",
    },
  });
}

export interface ContentEngineConfigView {
  id: string;
  providerName: string;
  apiBaseUrl: string;
  generationEndpoint: string;
  maskedApiKey: string | null;
  hasApiKey: boolean;
  authMethod: string;
  apiVersion: string | null;
  timeoutMs: number;
  retryCount: number;
  customHeaders: Record<string, string> | null;
  webhookUrl: string | null;
  mockMode: boolean;
  enabled: boolean;
  updatedAt: Date;
}

export async function getContentEngineConfigView(): Promise<ContentEngineConfigView> {
  const row = await getOrCreateContentEngineConfigRow();
  let maskedApiKey: string | null = null;
  if (row.apiKeyEncrypted) {
    try {
      maskedApiKey = maskSecret(decryptSecret(row.apiKeyEncrypted));
    } catch {
      maskedApiKey = "••••";
    }
  }
  return {
    id: row.id,
    providerName: row.providerName,
    apiBaseUrl: row.apiBaseUrl,
    generationEndpoint: row.generationEndpoint,
    maskedApiKey,
    hasApiKey: Boolean(row.apiKeyEncrypted),
    authMethod: row.authMethod,
    apiVersion: row.apiVersion,
    timeoutMs: row.timeoutMs,
    retryCount: row.retryCount,
    customHeaders: (row.customHeaders as Record<string, string> | null) ?? null,
    webhookUrl: row.webhookUrl,
    mockMode: row.mockMode,
    enabled: row.enabled,
    updatedAt: row.updatedAt,
  };
}

/** Resolves the config with the decrypted API key, for server-side use only. Never expose to the client. */
export async function getContentEngineRuntimeConfig(): Promise<ContentEngineRuntimeConfig> {
  const row = await getOrCreateContentEngineConfigRow();
  const apiKey = row.apiKeyEncrypted ? decryptSecret(row.apiKeyEncrypted) : "";
  return {
    providerName: row.providerName,
    apiBaseUrl: row.apiBaseUrl,
    generationEndpoint: row.generationEndpoint,
    apiKey,
    authMethod: row.authMethod,
    apiVersion: row.apiVersion,
    timeoutMs: row.timeoutMs,
    retryCount: row.retryCount,
    customHeaders: (row.customHeaders as Record<string, string> | null) ?? null,
    mockMode: row.mockMode,
    enabled: row.enabled,
  };
}

export interface UpdateContentEngineConfigInput {
  providerName?: string;
  apiBaseUrl?: string;
  generationEndpoint?: string;
  apiKey?: string; // plaintext, only present when the admin rotates it
  authMethod?: string;
  apiVersion?: string | null;
  timeoutMs?: number;
  retryCount?: number;
  customHeaders?: Record<string, string> | null;
  webhookUrl?: string | null;
  mockMode?: boolean;
  enabled?: boolean;
}

export async function updateContentEngineConfig(input: UpdateContentEngineConfigInput): Promise<void> {
  await getOrCreateContentEngineConfigRow();
  await prisma.contentEngineConfig.update({
    where: { id: SINGLETON_ID },
    data: {
      ...(input.providerName !== undefined ? { providerName: input.providerName } : {}),
      ...(input.apiBaseUrl !== undefined ? { apiBaseUrl: input.apiBaseUrl } : {}),
      ...(input.generationEndpoint !== undefined ? { generationEndpoint: input.generationEndpoint } : {}),
      ...(input.apiKey ? { apiKeyEncrypted: encryptSecret(input.apiKey) } : {}),
      ...(input.authMethod !== undefined ? { authMethod: input.authMethod } : {}),
      ...(input.apiVersion !== undefined ? { apiVersion: input.apiVersion } : {}),
      ...(input.timeoutMs !== undefined ? { timeoutMs: input.timeoutMs } : {}),
      ...(input.retryCount !== undefined ? { retryCount: input.retryCount } : {}),
      ...(input.customHeaders !== undefined
        ? { customHeaders: input.customHeaders === null ? Prisma.DbNull : input.customHeaders }
        : {}),
      ...(input.webhookUrl !== undefined ? { webhookUrl: input.webhookUrl } : {}),
      ...(input.mockMode !== undefined ? { mockMode: input.mockMode } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    },
  });
}
