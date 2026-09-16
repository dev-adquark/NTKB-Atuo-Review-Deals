import { describe, expect, it, afterAll } from "vitest";
import { buildCanonicalPath, buildCanonicalUrl, isProductionSiteUrl } from "@/lib/seo/canonical";

describe("buildCanonicalPath", () => {
  it("builds a keyword review path", () => {
    expect(buildCanonicalPath({ pageType: "KEYWORD_REVIEW", regionPrefix: "us", slug: "best-password-managers" })).toBe(
      "/us/best-password-managers",
    );
  });

  it("builds a brand review path using the brand slug", () => {
    expect(
      buildCanonicalPath({ pageType: "BRAND_REVIEW", regionPrefix: "in", slug: "ignored", brandSlug: "exampleguard" }),
    ).toBe("/in/reviews/exampleguard");
  });

  it("falls back to slug for brand review when no brandSlug is given", () => {
    expect(buildCanonicalPath({ pageType: "BRAND_REVIEW", regionPrefix: "in", slug: "exampleguard" })).toBe(
      "/in/reviews/exampleguard",
    );
  });

  it("builds a top-picks deals path", () => {
    expect(buildCanonicalPath({ pageType: "TOP_PICKS", regionPrefix: "au", slug: "best-password-manager-deals" })).toBe(
      "/au/deals/best-password-manager-deals",
    );
  });

  it("never mixes region prefixes across page types", () => {
    const us = buildCanonicalPath({ pageType: "KEYWORD_REVIEW", regionPrefix: "us", slug: "x" });
    const inPath = buildCanonicalPath({ pageType: "KEYWORD_REVIEW", regionPrefix: "in", slug: "x" });
    expect(us).not.toBe(inPath);
    expect(us.startsWith("/us/")).toBe(true);
    expect(inPath.startsWith("/in/")).toBe(true);
  });
});

describe("buildCanonicalUrl / isProductionSiteUrl", () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;
  afterAll(() => {
    process.env.NEXT_PUBLIC_SITE_URL = original;
  });

  it("joins the site URL and path, stripping trailing slash", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com/";
    expect(buildCanonicalUrl("/us/foo")).toBe("https://example.com/us/foo");
  });
  it("flags localhost as non-production", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    expect(isProductionSiteUrl()).toBe(false);
  });
  it("flags a real domain as production", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
    expect(isProductionSiteUrl()).toBe(true);
  });
});
