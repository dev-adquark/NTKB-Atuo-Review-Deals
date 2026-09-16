import type { PageType } from "@/app/generated/prisma/client";

/** External-facing page type identifiers, as sent to the Content Generation Engine. */
export type ExternalPageType = "keyword-review" | "brand-review" | "top-picks";

export function toExternalPageType(pageType: PageType): ExternalPageType {
  switch (pageType) {
    case "KEYWORD_REVIEW":
      return "keyword-review";
    case "BRAND_REVIEW":
      return "brand-review";
    case "TOP_PICKS":
      return "top-picks";
  }
}

export function pageTypeLabel(pageType: PageType): string {
  switch (pageType) {
    case "KEYWORD_REVIEW":
      return "Keyword Review Landing Page";
    case "BRAND_REVIEW":
      return "Brand Review Page";
    case "TOP_PICKS":
      return "Regional Top Picks / Deal Roundup";
  }
}
