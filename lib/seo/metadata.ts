import type { Metadata } from "next";
import { buildCanonicalUrl } from "./canonical";
import type { StoredSeo } from "@/lib/publishing/pipeline";
import type { GeneratedPage } from "@/app/generated/prisma/client";

export function buildPageMetadata(page: Pick<GeneratedPage, "canonicalPath" | "metaDescription" | "title" | "seo">): Metadata {
  const seo = page.seo as unknown as StoredSeo;
  const canonical = buildCanonicalUrl(page.canonicalPath);
  const title = seo.title || page.title;
  const description = seo.description || page.metaDescription;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}
