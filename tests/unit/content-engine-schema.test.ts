import { describe, expect, it } from "vitest";
import { generatedContentResultSchema, unwrapExternalResponse } from "@/lib/content-engine/schema";
import { generateMockContent } from "@/lib/content-engine/mock-provider";
import type { GenerationRequest } from "@/lib/content-engine/types";

describe("generatedContentResultSchema", () => {
  it("accepts a well-formed response", () => {
    const result = generatedContentResultSchema.safeParse({
      title: "Title",
      content: { sections: [{ heading: "H", level: 2, content: "Body" }] },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a response missing required content.sections", () => {
    const result = generatedContentResultSchema.safeParse({ title: "Title", content: {} });
    expect(result.success).toBe(false);
  });

  it("rejects a response with an invalid heading level", () => {
    const result = generatedContentResultSchema.safeParse({
      title: "Title",
      content: { sections: [{ heading: "H", level: 4, content: "Body" }] },
    });
    expect(result.success).toBe(false);
  });
});

describe("unwrapExternalResponse", () => {
  it("unwraps a { data: {...} } envelope", () => {
    expect(unwrapExternalResponse({ data: { title: "x" } })).toEqual({ title: "x" });
  });
  it("unwraps a { result: {...} } envelope", () => {
    expect(unwrapExternalResponse({ result: { title: "x" } })).toEqual({ title: "x" });
  });
  it("passes through an already-flat response", () => {
    expect(unwrapExternalResponse({ title: "x" })).toEqual({ title: "x" });
  });
});

describe("generateMockContent", () => {
  const request: GenerationRequest = {
    pageType: "keyword-review",
    keyword: "best password managers",
    brand: null,
    region: "US",
    language: "en-US",
    configuration: { includeFaq: true, includeProsCons: true, includeComparison: true },
  };

  it("produces a schema-valid, clearly-labeled mock response", () => {
    const result = generateMockContent(request);
    expect(generatedContentResultSchema.safeParse(result).success).toBe(true);
    expect(result.mock).toBe(true);
    expect(result.coverageNotes?.some((n) => n.includes("MOCK CONTENT"))).toBe(true);
  });

  it("includes FAQ/pros/cons/comparison only when requested", () => {
    const minimal = generateMockContent({ ...request, configuration: {} });
    expect(minimal.content.faq).toBeUndefined();
    expect(minimal.content.pros).toBeUndefined();
    expect(minimal.content.comparison).toBeUndefined();
  });
});
