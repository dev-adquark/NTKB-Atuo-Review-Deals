import type { GeneratedContentResult } from "@/lib/content-engine/types";
import type { DisclosureBlock } from "@/lib/validation/disclosure";
import type { ValidationIssue } from "@/lib/validation/content";
import type { StoredArticleImage } from "@/lib/pexels/types";

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
  /** Best-effort Pexels illustrative photo — absent when no image was found,
   * Pexels wasn't configured, or the search failed. Never a hard requirement
   * for publishing. */
  image?: StoredArticleImage;
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
