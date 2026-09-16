import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { buildCanonicalUrl } from "@/lib/seo/canonical";
import { buildWebsiteJsonLd } from "@/lib/seo/jsonld";

const SITE_NAME = "NTKB Auto Review Deals";
const SITE_DESCRIPTION =
  "Independent, region-aware reviews and top picks — with clear affiliate disclosure on every monetized page.";

// Without this, Next statically prerenders "/" once at build time (before any
// pages are published) and never picks up newly published content.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const canonical = buildCanonicalUrl("/");
  return {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    alternates: { canonical },
    openGraph: { title: SITE_NAME, description: SITE_DESCRIPTION, url: canonical, type: "website" },
    twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESCRIPTION },
  };
}

export default async function HomePage() {
  const [regions, featured] = await Promise.all([
    prisma.region.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    prisma.generatedPage.findMany({
      where: { status: "PUBLISHED", isCurrent: true },
      orderBy: { publishedAt: "desc" },
      take: 12,
      include: { region: true },
    }),
  ]);

  const websiteJsonLd = buildWebsiteJsonLd({ name: SITE_NAME, url: buildCanonicalUrl("/") });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />

      <section>
        <h1 className="text-3xl font-semibold text-neutral-900">{SITE_NAME}</h1>
        <p className="mt-3 max-w-2xl text-neutral-600">{SITE_DESCRIPTION}</p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-neutral-900">Browse by region</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {regions.map((region) => (
            <Link
              key={region.id}
              href={`/${region.urlPrefix}`}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            >
              {region.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-neutral-900">Latest reviews &amp; deals</h2>
        <ul className="mt-3 space-y-2">
          {featured.map((page) => (
            <li key={page.id}>
              <Link href={page.canonicalPath} className="text-neutral-700 underline">
                {page.title}
              </Link>
              <span className="ml-2 text-xs text-neutral-400">{page.region.code}</span>
            </li>
          ))}
          {featured.length === 0 ? <p className="text-neutral-500">No published pages yet.</p> : null}
        </ul>
      </section>

      <footer className="mt-16 border-t border-neutral-200 pt-6 text-sm text-neutral-500">
        <p>
          <Link href="/affiliate-disclosure" className="underline">
            Affiliate Disclosure
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="underline">
            Terms
          </Link>
        </p>
      </footer>
    </div>
  );
}
