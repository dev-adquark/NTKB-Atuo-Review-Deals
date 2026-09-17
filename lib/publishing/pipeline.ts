import "server-only";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getOrCreatePlatformSettings } from "@/lib/settings";
import { getContentEngineRuntimeConfig } from "@/lib/content-engine/config";
import { callContentEngine } from "@/lib/content-engine/client";
import { toExternalPageType } from "@/lib/types/page-type";
import { validateGeneratedContent, validatePlaceholdersResolved, type ValidationIssue } from "@/lib/validation/content";
import { computeUniqueness } from "@/lib/validation/uniqueness";
import { buildDisclosureBlocks } from "@/lib/validation/disclosure";
import { resolveAffiliateUrl, resolvePlaceholders } from "@/lib/affiliate/resolver";
import { buildCanonicalPath, buildCanonicalUrl } from "@/lib/seo/canonical";
import { slugify } from "@/lib/seo/slug";
import { computeContentHash, getNextVersion } from "@/lib/publishing/version";
import { evaluatePublishGates, allGatesPassed, type PublishGateResult } from "@/lib/validation/publish-gates";
import { queueGscSubmission, processGscSubmission } from "@/lib/gsc/submit";
import { searchLandscapeImage, buildImageSearchQuery } from "@/lib/pexels/client";
import type { GenerationRequest, GeneratedContentResult } from "@/lib/content-engine/types";
import type { PageType } from "@/app/generated/prisma/client";
import type { Prisma } from "@/app/generated/prisma/client";
import type { StoredPick, StoredPageContent, StoredSeo, ValidationReport } from "./types";

export type { StoredPick, StoredPageContent, StoredSeo, ValidationReport } from "./types";

export interface RunGenerationInput {
  regionId: string;
  pageType: PageType;
  keywordId?: string | null;
  brandId?: string | null;
  userId: string | null;
}

export interface GenerationOutcome {
  ok: boolean;
  blocked?: "DAILY_LIMIT_REACHED" | "DISABLED";
  jobId?: string;
  pageId?: string;
  issues?: ValidationIssue[];
  errorMessage?: string;
}

function deepReplaceText(
  result: GeneratedContentResult,
  vars: Record<string, string>,
): { result: GeneratedContentResult; unresolved: string[] } {
  const unresolved: string[] = [];
  const replace = (text: string | undefined): string | undefined => {
    if (text === undefined) return undefined;
    const { text: replaced, unresolved: tokens } = resolvePlaceholders(text, vars);
    unresolved.push(...tokens);
    return replaced;
  };

  const cloned: GeneratedContentResult = {
    ...result,
    title: replace(result.title) ?? result.title,
    metaDescription: replace(result.metaDescription),
    content: {
      ...result.content,
      intro: replace(result.content.intro),
      sections: result.content.sections.map((s) => ({ ...s, content: replace(s.content) ?? s.content })),
      pros: result.content.pros?.map((p) => replace(p) ?? p),
      cons: result.content.cons?.map((c) => replace(c) ?? c),
      comparison: result.content.comparison?.map((c) => ({ ...c, summary: replace(c.summary) })),
      faq: result.content.faq?.map((f) => ({ question: f.question, answer: replace(f.answer) ?? f.answer })),
      conclusion: replace(result.content.conclusion),
    },
    seo: result.seo
      ? { ...result.seo, title: replace(result.seo.title), description: replace(result.seo.description) }
      : undefined,
  };

  return { result: cloned, unresolved };
}

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function runGeneration(input: RunGenerationInput): Promise<GenerationOutcome> {
  const settings = await getOrCreatePlatformSettings();

  const jobsToday = await prisma.generationJob.count({
    where: { createdAt: { gte: startOfTodayUtc() } },
  });
  if (jobsToday >= settings.dailyGenerationLimit) {
    return { ok: false, blocked: "DAILY_LIMIT_REACHED" };
  }

  const region = await prisma.region.findUniqueOrThrow({ where: { id: input.regionId } });
  const keyword = input.keywordId
    ? await prisma.keyword.findUniqueOrThrow({ where: { id: input.keywordId } })
    : null;
  const brand = input.brandId ? await prisma.brand.findUniqueOrThrow({ where: { id: input.brandId } }) : null;

  const engineConfig = await getContentEngineRuntimeConfig();

  // The real Keyword-to-Blog API has no request-time flags to force FAQ/pros-cons/
  // comparison inclusion — whatever its own model produces is what it produces, and
  // its own `quality` verdict (checked below) is the trust signal for that content.
  // Only the mock provider honors these "include" flags deterministically, so only
  // require them from mock-generated content.
  const request: GenerationRequest = {
    pageType: toExternalPageType(input.pageType),
    keyword: keyword?.text ?? brand?.name ?? "",
    brand: brand?.name ?? null,
    region: region.code,
    language: region.language,
    configuration: engineConfig.mockMode
      ? {
          tone: "informational",
          format: "affiliate-review",
          includeFaq: true,
          includeProsCons: true,
          includeComparison: input.pageType !== "BRAND_REVIEW",
        }
      : undefined,
  };

  const configVersion = "1.0.0";
  const job = await prisma.generationJob.create({
    data: {
      keywordId: keyword?.id,
      brandId: brand?.id,
      regionId: region.id,
      pageType: input.pageType,
      status: "GENERATING",
      configVersion,
      requestPayload: request as unknown as Prisma.InputJsonValue,
    },
  });

  await logAudit({ userId: input.userId, action: "generation.requested", entityType: "GenerationJob", entityId: job.id, metadata: { request } as unknown as Prisma.InputJsonValue });

  const callResult = await callContentEngine(request, engineConfig);

  if (!callResult.ok) {
    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorCode: callResult.error.code,
        errorMessage: callResult.error.message,
        completedAt: new Date(),
      },
    });
    await logAudit({ userId: input.userId, action: "generation.failed", entityType: "GenerationJob", entityId: job.id, metadata: { error: callResult.error } as unknown as Prisma.InputJsonValue });
    return { ok: false, jobId: job.id, errorMessage: callResult.error.message };
  }

  const structuralIssues = validateGeneratedContent(callResult.result, request);

  // Affiliate resolution
  const picks: StoredPick[] = [];
  let brandAffiliate: { url: string | null } | null = null;
  const affiliateIssues: ValidationIssue[] = [];

  if (input.pageType === "BRAND_REVIEW" && brand) {
    const resolved = await resolveAffiliateUrl(brand.id, region.id);
    brandAffiliate = { url: resolved?.url ?? null };
    if (!resolved && settings.requireAffiliateMapping) {
      affiliateIssues.push({
        code: "AFFILIATE_MAPPING_MISSING",
        message: `No affiliate mapping found for brand "${brand.name}" in region ${region.code}.`,
      });
    }
  } else if (keyword && keyword.targetBrandIds.length > 0) {
    const brands = await prisma.brand.findMany({ where: { id: { in: keyword.targetBrandIds } } });
    const rankings = await prisma.brandRanking.findMany({
      where: { regionId: region.id, brandId: { in: keyword.targetBrandIds } },
    });
    for (const b of brands) {
      const resolved = await resolveAffiliateUrl(b.id, region.id);
      if (!resolved && settings.requireAffiliateMapping) {
        affiliateIssues.push({
          code: "AFFILIATE_MAPPING_MISSING",
          message: `No affiliate mapping found for brand "${b.name}" in region ${region.code}.`,
        });
      }
      picks.push({
        brandId: b.id,
        brandName: b.name,
        rank: rankings.find((r) => r.brandId === b.id)?.rank ?? null,
        affiliateUrl: resolved?.url ?? null,
      });
    }
    picks.sort((a, b2) => (a.rank ?? 999) - (b2.rank ?? 999));
  }

  // Placeholder resolution
  const vars: Record<string, string> = { region: region.code, keyword: request.keyword };
  if (brand) vars.brand_name = brand.name;
  if (brandAffiliate?.url) vars.brand_aff_url = brandAffiliate.url;
  const { result: resolvedContent, unresolved } = deepReplaceText(callResult.result, vars);

  const placeholderIssues = validatePlaceholdersResolved([...unresolved]);

  // Uniqueness
  const uniqueness = await computeUniqueness(resolvedContent.content.sections, input.pageType);
  const uniquenessIssues: ValidationIssue[] =
    uniqueness.score < settings.uniquenessMinScore
      ? [
          {
            code: "UNIQUENESS_FAILED",
            message: `Uniqueness score ${uniqueness.score.toFixed(2)} is below the minimum ${settings.uniquenessMinScore.toFixed(2)}.`,
          },
        ]
      : [];

  const allIssues = [...structuralIssues, ...affiliateIssues, ...placeholderIssues, ...uniquenessIssues];

  // Slug + canonical
  const slug = keyword?.slug ?? brand?.slug ?? slugify(resolvedContent.title);
  const canonicalPath = buildCanonicalPath({
    pageType: input.pageType,
    regionPrefix: region.urlPrefix,
    slug,
    brandSlug: brand?.slug,
  });

  const seo: StoredSeo = {
    title: resolvedContent.seo?.title ?? resolvedContent.title,
    description: resolvedContent.seo?.description ?? resolvedContent.metaDescription ?? "",
    keywords: resolvedContent.seo?.keywords ?? [request.keyword],
  };

  const hasAffiliateLinks = Boolean(brandAffiliate?.url) || picks.some((p) => p.affiliateUrl);
  const sponsored = brand
    ? await prisma.sponsoredPlacement.findFirst({
        where: {
          brandId: brand.id,
          regionId: region.id,
          active: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      })
    : null;
  const disclosures = buildDisclosureBlocks({
    hasAffiliateLinks,
    sponsored: sponsored ? { sponsorLabel: sponsored.sponsorLabel, disclosure: sponsored.disclosure } : null,
  });

  const internalLinkCandidates = await prisma.generatedPage.findMany({
    where: {
      regionId: region.id,
      status: "PUBLISHED",
      isCurrent: true,
      ...(keyword ? { keywordId: { not: keyword.id } } : {}),
      ...(brand ? { brandId: { not: brand.id } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { title: true, canonicalPath: true },
  });
  const internalLinks = internalLinkCandidates.map((p) => ({ title: p.title, url: buildCanonicalUrl(p.canonicalPath) }));

  // Best-effort illustrative photo — never blocks generation or publishing.
  // searchLandscapeImage returns null (never a fabricated URL) on missing
  // config, no results, or any failure.
  const imageQuery = buildImageSearchQuery({ keyword: keyword?.text, brand: brand?.name, category: keyword?.category });
  const image = await searchLandscapeImage(imageQuery);

  const content: StoredPageContent = {
    generated: resolvedContent,
    picks: picks.length > 0 ? picks : undefined,
    brand: brand ? { id: brand.id, name: brand.name, affiliateUrl: brandAffiliate?.url ?? null } : undefined,
    disclosures,
    image: image ?? undefined,
  };

  const validationReport: ValidationReport = {
    issues: allIssues,
    uniquenessScore: uniqueness.score,
    duplicatedSections: uniqueness.duplicatedSections,
    passed: allIssues.length === 0,
  };

  const version = await getNextVersion({
    regionId: region.id,
    pageType: input.pageType,
    keywordId: keyword?.id,
    brandId: brand?.id,
  });

  const page = await prisma.generatedPage.create({
    data: {
      generationJobId: job.id,
      keywordId: keyword?.id,
      brandId: brand?.id,
      regionId: region.id,
      pageType: input.pageType,
      version,
      title: resolvedContent.title,
      slug,
      metaDescription: seo.description,
      canonicalPath,
      content: content as unknown as Prisma.InputJsonValue,
      seo: seo as unknown as Prisma.InputJsonValue,
      internalLinks: internalLinks as unknown as Prisma.InputJsonValue,
      contentHash: computeContentHash(content),
      uniquenessScore: uniqueness.score,
      status: validationReport.passed ? "READY_FOR_REVIEW" : "DRAFT",
      validationReport: validationReport as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.generationJob.update({
    where: { id: job.id },
    data: {
      status: validationReport.passed ? "GENERATED" : "REJECTED",
      responsePayload: callResult.raw as Prisma.InputJsonValue,
      requestId: callResult.requestId,
      apiVersion: callResult.apiVersion,
      completedAt: new Date(),
    },
  });

  await logAudit({
    userId: input.userId,
    action: validationReport.passed ? "generation.completed" : "generation.rejected",
    entityType: "GeneratedPage",
    entityId: page.id,
    metadata: { validationReport } as unknown as Prisma.InputJsonValue,
  });

  return { ok: validationReport.passed, jobId: job.id, pageId: page.id, issues: allIssues };
}

export interface PublishOutcome {
  ok: boolean;
  gates: PublishGateResult[];
  pageId: string;
}

export async function publishGeneratedPage(pageId: string, userId: string | null): Promise<PublishOutcome> {
  const page = await prisma.generatedPage.findUniqueOrThrow({
    where: { id: pageId },
    include: { brand: true, region: true, keyword: true },
  });
  const settings = await getOrCreatePlatformSettings();

  const report = page.validationReport as unknown as ValidationReport | null;
  const content = page.content as unknown as StoredPageContent;

  let affiliateResolved = true;
  let affiliateRequired = false;
  if (page.pageType === "BRAND_REVIEW" && page.brandId) {
    affiliateRequired = true;
    const resolved = await resolveAffiliateUrl(page.brandId, page.regionId);
    affiliateResolved = Boolean(resolved) || !settings.requireAffiliateMapping;
  } else if (content.picks && content.picks.length > 0) {
    affiliateRequired = true;
    for (const pick of content.picks) {
      const resolved = await resolveAffiliateUrl(pick.brandId, page.regionId);
      if (!resolved && settings.requireAffiliateMapping) affiliateResolved = false;
    }
  }

  const sponsored = page.brandId
    ? await prisma.sponsoredPlacement.findFirst({
        where: {
          brandId: page.brandId,
          regionId: page.regionId,
          active: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      })
    : null;

  const gates = evaluatePublishGates({
    apiResponseValid: Boolean(report),
    requiredContentPresent: (report?.issues.filter((i) => i.code === "CONTENT_VALIDATION_FAILED").length ?? 1) === 0,
    hasSeoTitle: Boolean((page.seo as unknown as StoredSeo)?.title),
    hasMetaDescription: Boolean(page.metaDescription),
    hasCanonical: Boolean(page.canonicalPath),
    hasH1: Boolean(page.title),
    affiliateRequired,
    affiliateResolved,
    affiliateDisclosurePresent: content.disclosures.some((d) => d.type === "affiliate") || !affiliateRequired,
    sponsoredActive: Boolean(sponsored),
    sponsoredDisclosurePresent: content.disclosures.some((d) => d.type === "sponsored"),
    uniquenessScore: page.uniquenessScore ?? 0,
    uniquenessMinScore: settings.uniquenessMinScore,
    noUnresolvedPlaceholders: (report?.issues.filter((i) => i.code === "UNRESOLVED_PLACEHOLDER").length ?? 0) === 0,
    noProhibitedClaims: (report?.issues.filter((i) => i.code === "PROHIBITED_CLAIM").length ?? 0) === 0,
    faqJsonLdMatchesVisibleContent: true,
  });

  if (!allGatesPassed(gates)) {
    return { ok: false, gates, pageId };
  }

  await prisma.$transaction(async (tx) => {
    await tx.generatedPage.updateMany({
      where: {
        regionId: page.regionId,
        pageType: page.pageType,
        keywordId: page.keywordId,
        brandId: page.brandId,
        isCurrent: true,
        id: { not: page.id },
      },
      data: { isCurrent: false, status: "UNPUBLISHED" },
    });
    await tx.generatedPage.update({
      where: { id: page.id },
      data: { status: "PUBLISHED", isCurrent: true, publishedAt: new Date() },
    });
  });

  await logAudit({ userId, action: "page.published", entityType: "GeneratedPage", entityId: page.id });

  const submission = await queueGscSubmission(page.id, buildCanonicalUrl(page.canonicalPath));
  await processGscSubmission(submission.id);

  return { ok: true, gates, pageId };
}

export async function unpublishGeneratedPage(pageId: string, userId: string | null): Promise<void> {
  await prisma.generatedPage.update({
    where: { id: pageId },
    data: { isCurrent: false, status: "UNPUBLISHED" },
  });
  await logAudit({ userId, action: "page.unpublished", entityType: "GeneratedPage", entityId: pageId });
}
