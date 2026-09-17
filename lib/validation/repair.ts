import type { GeneratedContentResult } from "@/lib/content-engine/types";
import { scanForProhibitedClaims } from "./claims";
import { joinContentText } from "./text";

export interface ClaimRepairResult {
  result: GeneratedContentResult;
  repaired: string[];
}

// One safe, non-fabricating rewrite per lib/validation/claims.ts pattern. Each
// rewrite only ever softens or removes the flagged phrase — it never invents a
// replacement price, statistic, source, or claim of its own. Order matters:
// more specific patterns run before the shorter ones they overlap with.
const CLAIM_REPAIRS: Array<{ pattern: RegExp; replace: (match: string) => string; label: string }> = [
  {
    pattern: /\bfree money\b|\bguaranteed (savings|returns|ranking|performance)\b/gi,
    replace: (m) => m.replace(/guaranteed/i, "potential").replace(/free money/i, "potential savings"),
    label: "guaranteed outcome claim",
  },
  {
    pattern: /\bclinically proven\b/gi,
    replace: () => "commonly used",
    label: "unverified clinical claim",
  },
  {
    pattern: /#1\b|\bbest in the world\b|\bnumber one\b/gi,
    replace: () => "well-regarded",
    label: "unverified ranking/superlative claim",
  },
  {
    pattern: /\d{1,3}\s*%\s*(off|discount|savings)\b/gi,
    // Never invent a different number — drop the unverified figure, keep the noun.
    replace: (m) => m.replace(/\d{1,3}\s*%\s*/, ""),
    label: "unverified discount percentage",
  },
  {
    pattern: /\$\s?\d+(\.\d{2})?\b/g,
    // Never invent a different price — remove the unverified figure entirely;
    // the surrounding sentence is left to read generically rather than with a
    // fabricated or admin-unverified number.
    replace: () => "the current price",
    label: "unverified price figure",
  },
  {
    pattern: /\bguarantee[sd]?\b/gi,
    replace: (m) => {
      if (/^guaranteed$/i.test(m)) return "intended";
      if (/^guarantees$/i.test(m)) return "aims for";
      return "aim for";
    },
    label: "guarantee claim",
  },
  {
    pattern: /\brisk[- ]free\b/gi,
    replace: () => "lower-risk",
    label: "risk-free claim",
  },
  {
    pattern: /\bmiracle\b/gi,
    replace: () => "notable",
    label: "miracle claim",
  },
  {
    pattern: /\bcure[sd]?\b/gi,
    replace: (m) => (/s$/i.test(m) ? "helps with" : "helped with"),
    label: "medical cure claim",
  },
];

function repairText(text: string): { text: string; repaired: string[] } {
  let repairedText = text;
  const repaired: string[] = [];
  for (const { pattern, replace, label } of CLAIM_REPAIRS) {
    if (pattern.test(repairedText)) {
      repairedText = repairedText.replace(pattern, replace);
      repaired.push(label);
    }
    pattern.lastIndex = 0;
  }
  return { text: repairedText, repaired };
}

/**
 * Deterministically repairs every PROHIBITED_CLAIM pattern found across the
 * generated content's text fields — never by inventing a replacement price,
 * statistic, or claim, only by softening or removing the unsafe phrase. Safe
 * to call even when no claims are present (no-op). The caller must re-run
 * validateGeneratedContent()/scanForProhibitedClaims() on the result to
 * confirm the repair actually cleared every flagged pattern before treating
 * it as fixed — this function does not itself decide the content is safe.
 */
export function repairProhibitedClaims(result: GeneratedContentResult): ClaimRepairResult {
  const allRepaired = new Set<string>();
  const apply = (text?: string) => {
    if (!text) return text;
    const { text: repairedText, repaired } = repairText(text);
    repaired.forEach((label) => allRepaired.add(label));
    return repairedText;
  };

  const repaired: GeneratedContentResult = {
    ...result,
    title: apply(result.title) ?? result.title,
    metaDescription: apply(result.metaDescription),
    content: {
      ...result.content,
      intro: apply(result.content.intro),
      sections: result.content.sections.map((s) => ({ ...s, heading: apply(s.heading) ?? s.heading, content: apply(s.content) ?? s.content })),
      pros: result.content.pros?.map((p) => apply(p) ?? p),
      cons: result.content.cons?.map((c) => apply(c) ?? c),
      comparison: result.content.comparison?.map((c) => ({ ...c, name: apply(c.name) ?? c.name, summary: apply(c.summary) })),
      faq: result.content.faq?.map((f) => ({ question: apply(f.question) ?? f.question, answer: apply(f.answer) ?? f.answer })),
      conclusion: apply(result.content.conclusion),
    },
    seo: result.seo
      ? { ...result.seo, title: apply(result.seo.title), description: apply(result.seo.description) }
      : undefined,
  };

  return { result: repaired, repaired: Array.from(allRepaired) };
}

/** True when the content still has no PROHIBITED_CLAIM matches after repair. */
export function isFreeOfProhibitedClaims(result: GeneratedContentResult): boolean {
  return scanForProhibitedClaims(joinContentText(result)).length === 0;
}
