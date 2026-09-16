import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getRegionByPrefix } from "@/lib/render/public-page";
import { buildCanonicalUrl } from "@/lib/seo/canonical";

export async function generateMetadata({ params }: PageProps<"/[region]">): Promise<Metadata> {
  const { region: regionPrefix } = await params;
  const region = await getRegionByPrefix(regionPrefix);
  if (!region) return {};
  const canonical = buildCanonicalUrl(`/${region.urlPrefix}`);
  const title = `${region.name} — NTKB Auto Review Deals`;
  const description = `Reviews and top picks for shoppers in ${region.name}.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

export default async function RegionHubPage({ params }: PageProps<"/[region]">) {
  const { region: regionPrefix } = await params;
  const region = await getRegionByPrefix(regionPrefix);
  if (!region) notFound();

  const [rankings, pages] = await Promise.all([
    prisma.brandRanking.findMany({ where: { regionId: region.id }, include: { brand: true }, orderBy: { rank: "asc" } }),
    prisma.generatedPage.findMany({
      where: { regionId: region.id, status: "PUBLISHED", isCurrent: true },
      orderBy: { publishedAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">{region.name}</h1>
      <p className="mt-2 text-neutral-600">Reviews and top picks for shoppers in {region.name}.</p>

      {rankings.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-neutral-900">Top Brands</h2>
          <ol className="mt-2 space-y-1">
            {rankings.map((r) => (
              <li key={r.id}>
                <Link href={`/${region.urlPrefix}/reviews/${r.brand.slug}`} className="text-neutral-700 underline">
                  #{r.rank} {r.brand.name}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-900">Latest Reviews &amp; Deals</h2>
        <ul className="mt-2 space-y-2">
          {pages.map((page) => (
            <li key={page.id}>
              <Link href={page.canonicalPath} className="text-neutral-700 underline">
                {page.title}
              </Link>
            </li>
          ))}
          {pages.length === 0 ? <p className="text-neutral-500">No published pages yet.</p> : null}
        </ul>
      </section>
    </div>
  );
}
