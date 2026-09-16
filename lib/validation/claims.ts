export interface ClaimFlag {
  label: string;
  match: string;
}

// Heuristic guardrail against unsupported factual claims (spec sections 20-21).
// This is intentionally conservative: it flags patterns generated content should
// not contain unless the number/claim came from trusted admin/API data, since this
// application never fabricates prices, discounts, guarantees, or rankings.
const PROHIBITED_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bguarantee[sd]?\b/i, label: "guarantee claim" },
  { pattern: /\brisk[- ]free\b/i, label: "risk-free claim" },
  { pattern: /\bmiracle\b/i, label: "miracle claim" },
  { pattern: /\bcure[sd]?\b/i, label: "medical cure claim" },
  { pattern: /\bclinically proven\b/i, label: "unverified clinical claim" },
  { pattern: /\d{1,3}\s*%\s*(off|discount|savings)\b/i, label: "unverified discount percentage" },
  { pattern: /\$\s?\d+(\.\d{2})?\b/, label: "unverified price figure" },
  { pattern: /#1\b|\bbest in the world\b|\bnumber one\b/i, label: "unverified ranking/superlative claim" },
  { pattern: /\bfree money\b|\bguaranteed (savings|returns|ranking|performance)\b/i, label: "guaranteed outcome claim" },
];

export function scanForProhibitedClaims(text: string): ClaimFlag[] {
  const flags: ClaimFlag[] = [];
  for (const { pattern, label } of PROHIBITED_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      flags.push({ label, match: match[0] });
    }
  }
  return flags;
}
