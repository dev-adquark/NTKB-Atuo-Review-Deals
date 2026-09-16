import type { GeneratedContentResult } from "@/lib/content-engine/types";
import type { DisclosureBlock } from "@/lib/validation/disclosure";
import type { ValidationIssue } from "@/lib/validation/content";

export interface StoredPick {
  brandId: string;
  brandName: string;
  rank: number | null;
  affiliateUrl: string | null;
}

/** The shape actually persisted in GeneratedPage.content — kept separate from
 * lib/publishing/pipeline.ts so it can be imported (e.g. by lib/validation/uniqueness.ts)
 * without creating a circular import back into the pipeline. */
export interface StoredPageContent {
  generated: GeneratedContentResult;
  picks?: StoredPick[];
  brand?: { id: string; name: string; affiliateUrl: string | null };
  disclosures: DisclosureBlock[];
}

export interface StoredSeo {
  title: string;
  description: string;
  keywords: string[];
}

export interface ValidationReport {
  issues: ValidationIssue[];
  uniquenessScore: number;
  duplicatedSections: string[];
  passed: boolean;
}
