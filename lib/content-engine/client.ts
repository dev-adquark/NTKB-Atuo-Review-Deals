import "server-only";
import { randomUUID } from "node:crypto";
import { generateMockContent } from "./mock-provider";
import { buildKeywordToBlogRequestBody, mapKeywordToBlogError, parseKeywordToBlogSuccess } from "./providers/keyword-to-blog";
import type {
  ContentEngineCallResult,
  ContentEngineErrorInfo,
  ContentEngineRuntimeConfig,
  GenerationRequest,
} from "./types";

function buildHeaders(config: ContentEngineRuntimeConfig, idempotencyKey: string, requestId: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
    "Idempotency-Key": idempotencyKey,
    "X-Request-ID": requestId,
    ...(config.customHeaders ?? {}),
  };
  return headers;
}

function errorResult(error: ContentEngineErrorInfo, durationMs: number): ContentEngineCallResult {
  return { ok: false, error, durationMs };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls the external Content Generation Engine (the real Keyword-to-Blog API, or
 * the mock provider when mockMode is on) and normalizes the result. All network
 * calls happen here, server-side only — never call the external API from client
 * code, and the API key never leaves this module.
 */
export async function callContentEngine(
  request: GenerationRequest,
  config: ContentEngineRuntimeConfig,
): Promise<ContentEngineCallResult> {
  const startedAt = Date.now();

  if (config.mockMode) {
    await sleep(150 + Math.floor(Math.random() * 250));
    const result = generateMockContent(request);
    return {
      ok: true,
      result,
      requestId: result.requestId ?? "mock-unknown",
      apiVersion: "mock-1.0",
      httpStatus: 200,
      durationMs: Date.now() - startedAt,
      raw: result,
    };
  }

  if (!config.enabled) {
    return errorResult(
      {
        code: "CONTENT_API_NOT_CONFIGURED",
        message: "Content Generation Engine is disabled in admin settings.",
        retryable: false,
      },
      Date.now() - startedAt,
    );
  }

  if (!config.apiBaseUrl || !config.apiKey) {
    return errorResult(
      {
        code: "CONTENT_API_NOT_CONFIGURED",
        message: "Content Generation Engine base URL or API key is not configured.",
        retryable: false,
      },
      Date.now() - startedAt,
    );
  }

  const url = `${config.apiBaseUrl.replace(/\/$/, "")}${config.generationEndpoint}`;
  // Stable across retries of this same logical attempt: replaying with the same
  // Idempotency-Key returns the original job/result instead of double-generating
  // (the API docs guarantee this), which matters a lot given how tight this
  // API's request quota is.
  const idempotencyKey = randomUUID();
  const clientRequestId = randomUUID();
  const headers = buildHeaders(config, idempotencyKey, clientRequestId);
  const body = JSON.stringify(buildKeywordToBlogRequestBody(request, config));

  let attempt = 0;
  const maxAttempts = Math.max(1, config.retryCount + 1);

  while (attempt < maxAttempts) {
    attempt += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      let rawBody: unknown;
      try {
        rawBody = await response.json();
      } catch {
        return errorResult(
          {
            code: "CONTENT_API_INVALID_RESPONSE",
            message: "Content Generation Engine returned a response that was not valid JSON.",
            httpStatus: response.status,
            retryable: false,
          },
          Date.now() - startedAt,
        );
      }

      if (!response.ok) {
        const error = mapKeywordToBlogError(response.status, rawBody);
        if (error.retryable && attempt < maxAttempts) {
          await sleep(error.retryAfterMs ?? backoffDelay(attempt));
          continue;
        }
        return errorResult(error, Date.now() - startedAt);
      }

      const parsed = parseKeywordToBlogSuccess(rawBody);
      if (!parsed.ok) {
        return errorResult(parsed.error, Date.now() - startedAt);
      }

      return {
        ok: true,
        result: parsed.result,
        requestId: parsed.requestId,
        apiVersion: config.apiVersion ?? "v1",
        httpStatus: response.status,
        durationMs: Date.now() - startedAt,
        raw: rawBody,
      };
    } catch (error) {
      clearTimeout(timeout);
      const isAbort = error instanceof Error && error.name === "AbortError";
      if (isAbort) {
        if (attempt < maxAttempts) {
          await sleep(backoffDelay(attempt));
          continue;
        }
        return errorResult(
          {
            code: "CONTENT_API_TIMEOUT",
            message: `Content Generation Engine did not respond within ${config.timeoutMs}ms.`,
            retryable: true,
          },
          Date.now() - startedAt,
        );
      }

      if (attempt < maxAttempts) {
        await sleep(backoffDelay(attempt));
        continue;
      }

      return errorResult(
        {
          code: "CONTENT_API_UNKNOWN_ERROR",
          message: error instanceof Error ? error.message : "Unknown network error.",
          retryable: false,
        },
        Date.now() - startedAt,
      );
    }
  }

  return errorResult(
    {
      code: "CONTENT_API_UNKNOWN_ERROR",
      message: "Exhausted retries without a definitive response.",
      retryable: false,
    },
    Date.now() - startedAt,
  );
}

function backoffDelay(attempt: number): number {
  const base = 500 * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * 200);
  return base + jitter;
}
