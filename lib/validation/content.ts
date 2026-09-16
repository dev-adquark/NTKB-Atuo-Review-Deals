import type { GenerationRequest, GeneratedContentResult } from "@/lib/content-engine/types";
import { scanForProhibitedClaims } from "./claims";
import { findUnresolvedPlaceholders, joinContentText } from "./text";

export interface ValidationIssue {
  code: string;
  message: string;
}

/** Structural/business-rule checks run on the normalized API response before publishing. */
export function validateGeneratedContent(
  result: GeneratedContentResult,
  request: GenerationRequest,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!result.title.trim()) {
    issues.push({ code: "CONTENT_VALIDATION_FAILED", message: "Generated response is missing a title." });
  }
  if (result.content.sections.length === 0) {
    issues.push({ code: "CONTENT_VALIDATION_FAILED", message: "Generated response is missing required `content.sections`." });
  }
  for (const section of result.content.sections) {
    if (!section.heading.trim() || !section.content.trim()) {
      issues.push({ code: "CONTENT_VALIDATION_FAILED", message: "A content section is missing a heading or body." });
    }
  }

  if (request.configuration?.includeFaq) {
    if (!result.content.faq || result.content.faq.length === 0) {
      issues.push({ code: "CONTENT_VALIDATION_FAILED", message: "FAQ was requested but the response has no `content.faq` entries." });
    }
  }
  if (request.configuration?.includeProsCons) {
    if (!result.content.pros?.length || !result.content.cons?.length) {
      issues.push({ code: "CONTENT_VALIDATION_FAILED", message: "Pros/cons were requested but are missing or empty." });
    }
  }
  if (request.configuration?.includeComparison) {
    if (!result.content.comparison?.length) {
      issues.push({ code: "CONTENT_VALIDATION_FAILED", message: "Comparison was requested but `content.comparison` is missing or empty." });
    }
  }

  // Trust the external provider's own quality-pipeline verdict when it reports one
  // (e.g. Keyword-to-Blog's quality.status/score) — a provider that already rejected
  // its own output as sub-standard should never be treated as publishable.
  if (result.qualityStatus && result.qualityStatus !== "pass") {
    issues.push({
      code: "CONTENT_QUALITY_FAILED",
      message: `Content Generation Engine reported quality status "${result.qualityStatus}"${result.qualityScore !== undefined ? ` (score ${result.qualityScore})` : ""}.`,
    });
  }

  const flatText = joinContentText(result);
  for (const flag of scanForProhibitedClaims(flatText)) {
    issues.push({
      code: "PROHIBITED_CLAIM",
      message: `Possible unsupported claim detected (${flag.label}): "${flag.match}".`,
    });
  }

  return issues;
}

/** Run once more against the FINAL text after placeholder resolution, before publish. */
export function validatePlaceholdersResolved(finalTexts: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const text of finalTexts) {
    for (const token of findUnresolvedPlaceholders(text)) {
      issues.push({
        code: "UNRESOLVED_PLACEHOLDER",
        message: `Unresolved affiliate/content placeholder "${token}" would be published.`,
      });
    }
  }
  return issues;
}
