import { describe, expect, it } from "vitest";
import {
  buildKeywordToBlogRequestBody,
  parseKeywordToBlogSuccess,
  mapKeywordToBlogError,
} from "@/lib/content-engine/providers/keyword-to-blog";
import type { GenerationRequest } from "@/lib/content-engine/types";

const request: GenerationRequest = {
  pageType: "keyword-review",
  keyword: "best noise cancelling headphones",
  brand: null,
  region: "US",
  language: "en-US",
};

describe("buildKeywordToBlogRequestBody", () => {
  it("builds a request matching the documented Keyword-to-Blog schema", () => {
    const body = buildKeywordToBlogRequestBody(request, {
      defaultTone: "professional",
      defaultMaxWords: 600,
      factualityMode: "standard",
    });
    expect(body).toEqual({
      keywords: ["best noise cancelling headphones"],
      topic: undefined,
      language: "en",
      tone: "professional",
      constraints: { maxWords: 600 },
      format: { responseTypes: ["markdown"] },
      factualityMode: "standard",
    });
  });

  it("derives a bare ISO 639-1 language code from a BCP-47 region tag", () => {
    const body = buildKeywordToBlogRequestBody(
      { ...request, language: "en-IN" },
      { defaultTone: "friendly", defaultMaxWords: 500, factualityMode: "verified" },
    );
    expect(body.language).toBe("en");
  });

  it("builds a topic hint for brand-review requests", () => {
    const body = buildKeywordToBlogRequestBody(
      { ...request, brand: "ExampleGuard", pageType: "brand-review" },
      { defaultTone: "professional", defaultMaxWords: 600, factualityMode: "standard" },
    );
    expect(body.topic).toBe("ExampleGuard — best noise cancelling headphones");
  });
});

// This fixture mirrors the real POST /v1/generate response shape confirmed via a
// live test call against the production API on 2026-09-16 (title/meta/outline/
// sections/faqs/conclusion/coverageNotes/rendered/debug/quality), trimmed to a
// representative size — see lib/content-engine/providers/keyword-to-blog.ts.
const REAL_SUCCESS_FIXTURE = {
  requestId: "req_fixture123",
  post: {
    title: "Best Noise Cancelling Headphones: What Actually Matters",
    slugSuggestion: "best-noise-cancelling-headphones",
    meta: { description: "A guide to real ANC performance.", primaryKeyword: "best noise cancelling headphones" },
    outline: { h1: "Best Noise Cancelling Headphones", h2: ["The Three Non-Negotiable Specs", "Top Performers"] },
    sections: [
      { type: "intro", contentMarkdown: "Noise cancellation depth varies wildly across models." },
      {
        type: "specs",
        heading: "The Three Non-Negotiable Specs That Matter",
        contentMarkdown: "**Active Noise Cancellation Depth**: Effective ANC reduces ambient noise by 20-30 dB.",
        callout: "Test against low-frequency rumble before buying.",
      },
      { type: "conclusion", contentMarkdown: "Sony and Bose lead in peak ANC performance." },
    ],
    faqs: [{ question: "How much ANC depth is enough?", answer: "20-25 dB is realistic for most environments." }],
    conclusion: "Sony and Bose lead in peak ANC performance.",
    coverageNotes: {
      keywordCoverage: [
        { keyword: "best noise cancelling headphones", covered: true, evidence: "Title and intro reference it directly." },
      ],
    },
  },
  rendered: { markdown: "# Best Noise Cancelling Headphones\n\n..." },
  debug: { generationModel: "claude-haiku-4-5-20251001" },
  quality: { status: "pass", score: 100, revisionCount: 0, qualityVersion: "2.0.0" },
};

describe("parseKeywordToBlogSuccess", () => {
  it("normalizes a real-shaped success response into GeneratedContentResult", () => {
    const parsed = parseKeywordToBlogSuccess(REAL_SUCCESS_FIXTURE);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.result.title).toBe(REAL_SUCCESS_FIXTURE.post.title);
    expect(parsed.result.content.sections).toHaveLength(3);
    expect(parsed.result.content.sections[1].heading).toBe("The Three Non-Negotiable Specs That Matter");
    expect(parsed.result.content.sections[1].content).toContain("Test against low-frequency rumble");
    expect(parsed.result.content.sections[0].heading).toBe("Intro"); // derived from `type` when no `heading`
    expect(parsed.result.content.faq).toEqual(REAL_SUCCESS_FIXTURE.post.faqs);
    expect(parsed.result.qualityStatus).toBe("pass");
    expect(parsed.result.qualityScore).toBe(100);
    expect(parsed.result.mock).toBe(false);
  });

  it("rejects a response missing required fields rather than inventing them", () => {
    const parsed = parseKeywordToBlogSuccess({ requestId: "x", post: { title: "T" } });
    expect(parsed.ok).toBe(false);
  });
});

// These are the exact error bodies returned by the real API during live testing.
describe("mapKeywordToBlogError (using real captured error responses)", () => {
  it("maps a per-minute RATE_LIMITED 429 to a retryable error with backoff timing", () => {
    const body = {
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests per minute. Please slow down.",
        requestId: "req_a96a7f732bed46969aba08fc41687edb",
        details: { limit: 1, remaining: 0, resetAt: "2099-01-01T00:00:00.000Z" },
      },
    };
    const error = mapKeywordToBlogError(429, body);
    expect(error.code).toBe("CONTENT_API_RATE_LIMITED");
    expect(error.retryable).toBe(true);
    expect(error.retryAfterMs).toBeGreaterThan(0);
    expect(error.requestId).toBe(body.error.requestId);
  });

  it("maps a daily-quota RATE_LIMITED 429 the same way as a per-minute one", () => {
    const body = {
      error: {
        code: "RATE_LIMITED",
        message: "Daily API request limit reached.",
        requestId: "req_35e7018f3b0f42448ccb7a497dddda57",
        details: { limit: 3, remaining: 0, resetAt: "2099-01-01T00:00:00.000Z" },
      },
    };
    const error = mapKeywordToBlogError(429, body);
    expect(error.code).toBe("CONTENT_API_RATE_LIMITED");
    expect(error.retryable).toBe(true);
  });

  it("maps INTERNAL_ERROR (500, content length constraint failure) as retryable", () => {
    const body = {
      error: {
        code: "INTERNAL_ERROR",
        message: "Generated content did not meet the requested length constraints. Please try again.",
        requestId: "req_ff5133a2685e4e0cb2f67d209ccea181",
      },
    };
    const error = mapKeywordToBlogError(500, body);
    expect(error.code).toBe("CONTENT_API_SERVER_ERROR");
    expect(error.retryable).toBe(true);
  });

  it("maps AUTH_INVALID as a non-retryable auth failure", () => {
    const error = mapKeywordToBlogError(401, {
      error: { code: "AUTH_INVALID", message: "The API key is malformed, unrecognized, or revoked." },
    });
    expect(error.code).toBe("CONTENT_API_AUTH_FAILED");
    expect(error.retryable).toBe(false);
  });

  it("maps VALIDATION_ERROR and PROHIBITED_INPUT as non-retryable invalid-request errors", () => {
    expect(mapKeywordToBlogError(400, { error: { code: "VALIDATION_ERROR", message: "bad request" } }).code).toBe(
      "CONTENT_API_INVALID_REQUEST",
    );
    expect(mapKeywordToBlogError(422, { error: { code: "PROHIBITED_INPUT", message: "blocked" } }).retryable).toBe(false);
  });

  it("maps CONTENT_QUALITY_FAILED as non-retryable (spec: don't blindly retry a real quality rejection)", () => {
    const error = mapKeywordToBlogError(422, {
      error: { code: "CONTENT_QUALITY_FAILED", message: "Generated content did not meet required quality standard." },
    });
    expect(error.code).toBe("CONTENT_API_QUALITY_FAILED");
    expect(error.retryable).toBe(false);
  });

  it("falls back to HTTP-status-based mapping for an unrecognized error body", () => {
    expect(mapKeywordToBlogError(503, {}).retryable).toBe(true);
    expect(mapKeywordToBlogError(403, {}).code).toBe("CONTENT_API_AUTH_FAILED");
  });
});
