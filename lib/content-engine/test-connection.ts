import "server-only";
import type { ContentEngineRuntimeConfig } from "./types";

export interface TestConnectionResult {
  connected: boolean;
  httpStatus?: number;
  latencyMs: number;
  message: string;
}

/**
 * Verifies reachability/auth wiring WITHOUT invoking a real (billable) generation
 * request — it makes a lightweight GET against the configured base URL. A 2xx-4xx
 * response means the network path and TLS/DNS are fine; only network/timeout errors
 * count as "connection failed". 401/403 are called out explicitly as auth failures.
 */
export async function testContentEngineConnection(
  config: ContentEngineRuntimeConfig,
): Promise<TestConnectionResult> {
  const startedAt = Date.now();

  if (config.mockMode) {
    await new Promise((resolve) => setTimeout(resolve, 120));
    return {
      connected: true,
      httpStatus: 200,
      latencyMs: Date.now() - startedAt,
      message: "Mock mode is enabled — no external request was made.",
    };
  }

  if (!config.apiBaseUrl) {
    return {
      connected: false,
      latencyMs: Date.now() - startedAt,
      message: "No API base URL configured.",
    };
  }

  const headers: Record<string, string> = { ...(config.customHeaders ?? {}) };
  if (config.apiKey) {
    if (config.authMethod === "api-key-header") {
      headers["X-API-Key"] = config.apiKey;
    } else {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(config.timeoutMs, 10_000));

  try {
    const response = await fetch(config.apiBaseUrl, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.status === 401 || response.status === 403) {
      return {
        connected: false,
        httpStatus: response.status,
        latencyMs: Date.now() - startedAt,
        message: "Reached the server, but the API key was rejected (Unauthorized).",
      };
    }

    return {
      connected: true,
      httpStatus: response.status,
      latencyMs: Date.now() - startedAt,
      message: `Reached the server (HTTP ${response.status}).`,
    };
  } catch (error) {
    clearTimeout(timeout);
    const isAbort = error instanceof Error && error.name === "AbortError";
    return {
      connected: false,
      latencyMs: Date.now() - startedAt,
      message: isAbort ? "Connection timed out." : "Could not reach the server.",
    };
  }
}
