import { z } from "zod";
import type { GenerationRequest, GeneratedContentResult, ContentEngineErrorInfo, ContentEngineRuntimeConfig } from "../types";

/**
 * Adapter for the real "Keyword-to-Blog" Content Generation Engine
 * (POST /v1/generate). Schema below reflects the documented + actually observed
 * contract — see docs at <api base url>/docs/api-reference/generate and
 * /docs/error-codes. Do not add fields the API doesn't document; do not assume
 * fields it doesn't guarantee (pros/cons/comparison are NOT part of its schema —
 * whatever structure it produces lives inside `post.sections[].contentMarkdown`
 * as markdown, which NTKB renders as-is rather than trying to re-parse).
 */

export interface KeywordToBlogRequestBody {
  keywords: string[];
  topic?: string;
  language: string;
  tone: "professional" | "friendly" | "bold";
  constraints: { maxWords: number };
  format: { responseTypes: Array<"json" | "markdown" | "html"> };
  factualityMode?: "standard" | "verified";
}

export function buildKeywordToBlogRequestBody(
  request: GenerationRequest,
  config: Pick<ContentEngineRuntimeConfig, "defaultTone" | "defaultMaxWords" | "factualityMode">,
): KeywordToBlogRequestBody {
  const topic = request.brand ? `${request.brand} — ${request.keyword}` : undefined;
  return {
    keywords: [request.keyword],
    topic,
    language: toIso639(request.language),
    tone: config.defaultTone,
    constraints: { maxWords: config.defaultMaxWords },
    format: { responseTypes: ["markdown"] },
    factualityMode: config.factualityMode,
  };
}

function toIso639(languageTag: string): string {
  // Region.language is stored as a BCP-47 tag like "en-US"; the API wants a
  // bare ISO 639-1 code like "en".
  return languageTag.split("-")[0].toLowerCase();
}

const sectionSchema = z.object({
  type: z.string(),
  contentMarkdown: z.string(),
  heading: z.string().optional(),
  callout: z.string().optional(),
});

const faqSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

const postSchema = z.object({
  title: z.string().min(1),
  slugSuggestion: z.string().optional(),
  meta: z.object({
    description: z.string().optional(),
    primaryKeyword: z.string().optional(),
  }),
  outline: z.object({
    h1: z.string().optional(),
    h2: z.array(z.string()).optional(),
  }),
  sections: z.array(sectionSchema).min(1),
  faqs: z.array(faqSchema).optional(),
  conclusion: z.string().optional(),
  coverageNotes: z
    .object({
      keywordCoverage: z
        .array(z.object({ keyword: z.string(), covered: z.boolean(), evidence: z.string().optional() }))
        .optional(),
    })
    .optional(),
});

const qualitySchema = z.object({
  status: z.string(),
  score: z.number().optional(),
  revisionCount: z.number().optional(),
  qualityVersion: z.string().optional(),
});

/** POST /v1/generate success response (200). */
const generateSuccessSchema = z.object({
  requestId: z.string(),
  post: postSchema,
  rendered: z.object({ markdown: z.string().optional(), html: z.string().optional() }).optional(),
  debug: z.object({ generationModel: z.string().optional() }).passthrough().optional(),
  quality: qualitySchema.optional(),
});

/** Every documented error response shape ({ error: {...} }), from /docs/error-codes. */
const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
    details: z.record(z.string(), z.unknown()).optional(),
    retryAfterSeconds: z.number().optional(),
  }),
});

export interface KeywordToBlogParseResult {
  ok: true;
  result: GeneratedContentResult;
  requestId: string;
}

export interface KeywordToBlogParseError {
  ok: false;
  error: ContentEngineErrorInfo;
}

function capitalizeWords(text: string): string {
  return text.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function parseKeywordToBlogSuccess(raw: unknown): KeywordToBlogParseResult | KeywordToBlogParseError {
  const parsed = generateSuccessSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "CONTENT_API_INVALID_RESPONSE",
        message: `Generated response failed schema validation: ${parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")}`,
        retryable: false,
      },
    };
  }

  const { post, quality } = parsed.data;

  const result: GeneratedContentResult = {
    requestId: parsed.data.requestId,
    title: post.title,
    slugSuggestion: post.slugSuggestion,
    metaDescription: post.meta.description,
    primaryKeyword: post.meta.primaryKeyword,
    content: {
      sections: post.sections.map((s) => ({
        heading: s.heading ?? capitalizeWords(s.type),
        level: 2 as const,
        // The API's content is markdown; NTKB renders it with a markdown
        // renderer rather than trying to re-parse pros/cons/comparison out of
        // it, since those aren't part of this API's structured schema.
        content: s.callout ? `${s.contentMarkdown}\n\n> ${s.callout}` : s.contentMarkdown,
      })),
      faq: post.faqs,
      conclusion: post.conclusion,
    },
    seo: {
      title: post.title,
      description: post.meta.description,
      keywords: post.coverageNotes?.keywordCoverage?.map((k) => k.keyword),
    },
    coverageNotes: post.coverageNotes?.keywordCoverage
      ?.filter((k) => !k.covered)
      .map((k) => `Keyword not clearly covered: "${k.keyword}"${k.evidence ? ` (${k.evidence})` : ""}`),
    qualityStatus: quality?.status,
    qualityScore: quality?.score,
    mock: false,
  };

  return { ok: true, result, requestId: parsed.data.requestId };
}

/** Maps a non-2xx response to a normalized error, per /docs/error-codes. */
export function mapKeywordToBlogError(httpStatus: number, rawBody: unknown): ContentEngineErrorInfo {
  const parsed = errorEnvelopeSchema.safeParse(rawBody);
  const requestId = parsed.success ? parsed.data.error.requestId : undefined;
  const details = parsed.success ? parsed.data.error.details : undefined;
  const code = parsed.success ? parsed.data.error.code : undefined;
  const message = parsed.success ? parsed.data.error.message : `HTTP ${httpStatus} with an unrecognized error body.`;

  let retryAfterMs: number | undefined;
  if (parsed.success && parsed.data.error.retryAfterSeconds) {
    retryAfterMs = parsed.data.error.retryAfterSeconds * 1000;
  } else if (details && typeof details.resetAt === "string") {
    const resetMs = Date.parse(details.resetAt);
    if (!Number.isNaN(resetMs)) retryAfterMs = Math.max(0, resetMs - Date.now());
  }

  switch (code) {
    case "AUTH_MISSING":
    case "AUTH_INVALID":
    case "SCOPE_INSUFFICIENT":
      return { code: "CONTENT_API_AUTH_FAILED", message, httpStatus, requestId, retryable: false };
    case "QUOTA_EXCEEDED":
    case "RATE_LIMITED":
      return { code: "CONTENT_API_RATE_LIMITED", message, httpStatus, requestId, retryable: true, retryAfterMs };
    case "VALIDATION_ERROR":
    case "PROHIBITED_INPUT":
      return { code: "CONTENT_API_INVALID_REQUEST", message, httpStatus, requestId, retryable: false };
    case "CONTENT_QUALITY_FAILED":
    case "JOB_FAILED":
      return { code: "CONTENT_API_QUALITY_FAILED", message, httpStatus, requestId, retryable: false };
    case "INTERNAL_ERROR":
      return { code: "CONTENT_API_SERVER_ERROR", message, httpStatus, requestId, retryable: true };
    default:
      if (httpStatus === 401 || httpStatus === 403) {
        return { code: "CONTENT_API_AUTH_FAILED", message, httpStatus, requestId, retryable: false };
      }
      if (httpStatus === 429) {
        return { code: "CONTENT_API_RATE_LIMITED", message, httpStatus, requestId, retryable: true, retryAfterMs };
      }
      if (httpStatus >= 500) {
        return { code: "CONTENT_API_SERVER_ERROR", message, httpStatus, requestId, retryable: true };
      }
      return { code: "CONTENT_API_INVALID_REQUEST", message, httpStatus, requestId, retryable: false };
  }
}
