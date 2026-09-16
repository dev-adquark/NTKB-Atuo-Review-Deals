import { z } from "zod";

const sectionSchema = z.object({
  heading: z.string().min(1),
  level: z.union([z.literal(2), z.literal(3)]),
  content: z.string().min(1),
});

const comparisonItemSchema = z.object({
  name: z.string().min(1),
  summary: z.string().optional(),
});

const faqItemSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

const contentBodySchema = z.object({
  intro: z.string().optional(),
  sections: z.array(sectionSchema),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
  comparison: z.array(comparisonItemSchema).optional(),
  faq: z.array(faqItemSchema).optional(),
  conclusion: z.string().optional(),
});

const seoSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});

/** Structural schema for the normalized Content Generation Engine response. */
export const generatedContentResultSchema = z.object({
  requestId: z.string().optional(),
  title: z.string().min(1),
  slugSuggestion: z.string().optional(),
  metaDescription: z.string().optional(),
  primaryKeyword: z.string().optional(),
  content: contentBodySchema,
  seo: seoSchema.optional(),
  coverageNotes: z.array(z.string()).optional(),
  mock: z.boolean().optional(),
});

/**
 * Unwraps common envelope shapes ({ data: {...} }, { result: {...} }) before schema
 * validation. Adapt this if the real external API wraps its payload differently, or
 * if field names differ (map them here rather than downstream).
 */
export function unwrapExternalResponse(raw: unknown): unknown {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if ("data" in obj && obj.data && typeof obj.data === "object") return obj.data;
    if ("result" in obj && obj.result && typeof obj.result === "object") return obj.result;
  }
  return raw;
}
