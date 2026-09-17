import "server-only";

// RFC 6761 reserves the entire .example TLD (and example.com/.org/.net) for
// documentation — exactly what this project's own seed data uses as a stand-in
// until a real affiliate program is configured. A mapping pointing here is not
// a real destination and must never be treated as one.
const PLACEHOLDER_HOSTNAME_SUFFIXES = [".example", "example.com", "example.org", "example.net", "example.edu"];
const PLACEHOLDER_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

/**
 * True only for a syntactically valid, real-looking https(s) destination — never
 * a placeholder/example domain, localhost, or a non-http(s) protocol. Used both
 * when resolving which affiliate URL to show a visitor and, defense-in-depth, at
 * the actual /click redirect — a mapping failing this check is treated exactly
 * like no mapping at all, never silently forwarded to.
 */
export function isRealAffiliateDestination(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;

  const hostname = parsed.hostname.toLowerCase();
  if (PLACEHOLDER_HOSTNAMES.has(hostname)) return false;
  if (PLACEHOLDER_HOSTNAME_SUFFIXES.some((suffix) => hostname === suffix.replace(/^\./, "") || hostname.endsWith(suffix))) {
    return false;
  }

  return true;
}
