import type { RegionCode } from "@/app/generated/prisma/client";
import type { ExternalPageType } from "@/lib/types/page-type";

export interface GenerationConfiguration {
  tone?: string;
  format?: string;
  includeFaq?: boolean;
  includeProsCons?: boolean;
  includeComparison?: boolean;
}

export interface GenerationRequest {
  pageType: ExternalPageType;
  keyword: string;
  brand: string | null;
  region: RegionCode;
  language: string;
  configuration?: GenerationConfiguration;
}

export interface GeneratedContentSection {
  heading: string;
  level: 2 | 3;
  content: string;
}

export interface GeneratedContentComparisonItem {
  name: string;
  summary?: string;
}

export interface GeneratedContentFaqItem {
  question: string;
  answer: string;
}

export interface GeneratedContentBody {
  intro?: string;
  sections: GeneratedContentSection[];
  pros?: string[];
  cons?: string[];
  comparison?: GeneratedContentComparisonItem[];
  faq?: GeneratedContentFaqItem[];
  conclusion?: string;
}

export interface GeneratedContentSeo {
  title?: string;
  description?: string;
  keywords?: string[];
}

/** Normalized shape every external API response is adapted into before validation/publishing. */
export interface GeneratedContentResult {
  requestId?: string;
  title: string;
  slugSuggestion?: string;
  metaDescription?: string;
  primaryKeyword?: string;
  content: GeneratedContentBody;
  seo?: GeneratedContentSeo;
  coverageNotes?: string[];
  /** The external provider's own quality-pipeline verdict, when it reports one (e.g. the
   * Keyword-to-Blog API's `quality.status`/`quality.score`). Trusted as an additional
   * signal alongside NTKB's own validation — never overrides it. */
  qualityStatus?: string;
  qualityScore?: number;
  /** Set only by the mock provider. Never true for a real external API response. */
  mock?: boolean;
}

export interface ContentEngineErrorInfo {
  code:
    | "CONTENT_API_AUTH_FAILED"
    | "CONTENT_API_RATE_LIMITED"
    | "CONTENT_API_INVALID_REQUEST"
    | "CONTENT_API_QUALITY_FAILED"
    | "CONTENT_API_TIMEOUT"
    | "CONTENT_API_INVALID_RESPONSE"
    | "CONTENT_API_SERVER_ERROR"
    | "CONTENT_API_NOT_CONFIGURED"
    | "CONTENT_API_UNKNOWN_ERROR";
  message: string;
  httpStatus?: number;
  requestId?: string;
  retryable: boolean;
  /** When the provider tells us exactly when it's safe to retry (e.g. a 429's
   * `resetAt`/`retryAfterSeconds`), prefer this over blind exponential backoff. */
  retryAfterMs?: number;
}

export type ContentEngineCallResult =
  | {
      ok: true;
      result: GeneratedContentResult;
      requestId: string;
      apiVersion: string;
      httpStatus: number;
      durationMs: number;
      raw: unknown;
    }
  | {
      ok: false;
      error: ContentEngineErrorInfo;
      durationMs: number;
    };

export interface ContentEngineRuntimeConfig {
  providerName: string;
  apiBaseUrl: string;
  generationEndpoint: string;
  apiKey: string;
  authMethod: string;
  apiVersion?: string | null;
  timeoutMs: number;
  retryCount: number;
  customHeaders?: Record<string, string> | null;
  mockMode: boolean;
  enabled: boolean;
  /** Keyword-to-Blog API generation parameters (spec section 3) — admin-configurable. */
  defaultTone: "professional" | "friendly" | "bold";
  defaultMaxWords: number;
  factualityMode: "standard" | "verified";
}
