import "server-only";

export interface GscCallResult {
  ok: boolean;
  httpStatus?: number;
  response?: unknown;
  error?: string;
}

function isGscConfigured(): boolean {
  return Boolean(
    process.env.GSC_CLIENT_ID && process.env.GSC_CLIENT_SECRET && process.env.GSC_REFRESH_TOKEN && process.env.GSC_PROPERTY_URL,
  );
}

async function getAccessToken(): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GSC_CLIENT_ID ?? "",
      client_secret: process.env.GSC_CLIENT_SECRET ?? "",
      refresh_token: process.env.GSC_REFRESH_TOKEN ?? "",
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to refresh Google OAuth token (HTTP ${response.status}).`);
  }
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Google OAuth token response did not include an access_token.");
  }
  return data.access_token;
}

/**
 * Submits a URL notification via Google's Indexing API. This reports SUBMISSION
 * status only — it never claims the URL has been indexed (spec sections 17, 123).
 * Returns a clear "not configured" error when GSC credentials are absent, rather
 * than fabricating success.
 */
export async function submitUrlToGsc(url: string): Promise<GscCallResult> {
  if (!isGscConfigured()) {
    return { ok: false, error: "Google Search Console is not configured (missing client ID/secret/refresh token/property URL)." };
  }

  try {
    const accessToken = await getAccessToken();
    const response = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, type: "URL_UPDATED" }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      return { ok: false, httpStatus: response.status, response: body, error: `Google returned HTTP ${response.status}.` };
    }
    return { ok: true, httpStatus: response.status, response: body };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown GSC error." };
  }
}
