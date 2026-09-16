/**
 * All Content Generation Engine text fields are rendered as plain React text nodes
 * (never via dangerouslySetInnerHTML), so JSX's automatic escaping already prevents
 * script/HTML injection from generated content. This helper exists as a defense-in-depth
 * backstop for any field that ever needs `<pre>`/plain-text display of raw content
 * (e.g. the admin request/response debugger), stripping characters that could be
 * mistaken for markup when copy-pasted elsewhere.
 */
export function stripDangerousMarkup(text: string): string {
  return text.replace(/<\s*(script|iframe|object|embed|link|style)\b[^>]*>/gi, "").replace(/javascript:/gi, "");
}
