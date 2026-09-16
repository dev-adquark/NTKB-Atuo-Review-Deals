import "server-only";
import { generateMockContent } from "./mock-provider";
import { generatedContentResultSchema, unwrapExternalResponse } from "./schema";
import type {
  ContentEngineCallResult,
  ContentEngineErrorInfo,
  ContentEngineRuntimeConfig,
  GenerationRequest,
} from "./types";

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

function buildHeaders(config: ContentEngineRuntimeConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(config.customHeaders ?? {}),
  };
  if (config.authMethod === "api-key-header") {
    headers["X-API-Key"] = config.apiKey;
  } else {
    // default: bearer
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }
  if (config.apiVersion) {
    headers["X-Content-Engine-Version"] = config.apiVersion;
  }
  return headers;
}

function errorResult(error: ContentEngineErrorInfo, durationMs: number): ContentEngineCallResult {
  return { ok: false, error, durationMs };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls the external Content Generation Engine (or the mock provider when mockMode is
 * on) and normalizes the result. All network calls happen here, server-side only —
 * never call the external API from client code.
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
  const headers = buildHeaders(config);
  const body = JSON.stringify(request);

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

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return errorResult(
            {
              code: "CONTENT_API_AUTH_FAILED",
              message: `Content Generation Engine rejected the API key (HTTP ${response.status}).`,
              httpStatus: response.status,
              retryable: false,
            },
            Date.now() - startedAt,
          );
        }

        if (RETRYABLE_STATUSES.has(response.status) && attempt < maxAttempts) {
          await sleep(backoffDelay(attempt));
          continue;
        }

        const code = response.status === 429 ? "CONTENT_API_RATE_LIMITED" : "CONTENT_API_SERVER_ERROR";
        return errorResult(
          {
            code,
            message: `Content Generation Engine returned HTTP ${response.status}.`,
            httpStatus: response.status,
            retryable: RETRYABLE_STATUSES.has(response.status),
          },
          Date.now() - startedAt,
        );
      }

      let raw: unknown;
      try {
        raw = await response.json();
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

      const parsed = generatedContentResultSchema.safeParse(unwrapExternalResponse(raw));
      if (!parsed.success) {
        return errorResult(
          {
            code: "CONTENT_API_INVALID_RESPONSE",
            message: `Generated response failed schema validation: ${parsed.error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; ")}`,
            httpStatus: response.status,
            retryable: false,
          },
          Date.now() - startedAt,
        );
      }

      const requestId =
        parsed.data.requestId ??
        (typeof raw === "object" && raw !== null && "requestId" in raw
          ? String((raw as Record<string, unknown>).requestId)
          : `unknown-${Date.now()}`);

      return {
        ok: true,
        result: parsed.data,
        requestId,
        apiVersion: config.apiVersion ?? "unknown",
        httpStatus: response.status,
        durationMs: Date.now() - startedAt,
        raw,
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
