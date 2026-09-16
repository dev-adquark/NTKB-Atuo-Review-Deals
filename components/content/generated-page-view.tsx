import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd } from "@/lib/seo/jsonld";
import { buildCanonicalUrl } from "@/lib/seo/canonical";
import { getHreflangAlternates } from "@/lib/seo/hreflang";
import { AffiliateCtaLink } from "@/components/affiliate/affiliate-cta-link";
import { Markdown } from "@/components/content/markdown";
import type { StoredPageContent } from "@/lib/publishing/pipeline";
import type { GeneratedPage, Region, Brand, Keyword } from "@/app/generated/prisma/client";

const MARKDOWN_CLASS =
  "prose-content mt-2 text-neutral-700 [&_strong]:font-semibold [&_strong]:text-neutral-900 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:underline [&_blockquote]:mt-2 [&_blockquote]:border-l-2 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-3 [&_blockquote]:text-neutral-600 [&_p+p]:mt-3";

type PageWithRelations = GeneratedPage & { region: Region; brand: Brand | null; keyword: Keyword | null };

export async function GeneratedPageView({ page }: { page: PageWithRelations }) {
  const content = page.content as unknown as StoredPageContent;
  const generated = content.generated;
  const canonicalUrl = buildCanonicalUrl(page.canonicalPath);

  const hreflang = await getHreflangAlternates({
    pageType: page.pageType,
    selfPageId: page.id,
    brandId: page.brandId,
    keywordText: page.keyword?.text,
  });

  const breadcrumbItems = [
    { name: "Home", url: buildCanonicalUrl("/") },
    { name: page.region.name, url: buildCanonicalUrl(`/${page.region.urlPrefix}`) },
    { name: page.title, url: canonicalUrl },
  ];

  const articleJsonLd = buildArticleJsonLd({
    headline: page.title,
    description: page.metaDescription,
    url: canonicalUrl,
    datePublished: (page.publishedAt ?? page.createdAt).toISOString(),
    dateModified: page.updatedAt.toISOString(),
  });
  const faqJsonLd = generated.content.faq && generated.content.faq.length > 0 ? buildFaqJsonLd(generated.content.faq) : null;
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      {Object.entries(hreflang).map(([lang, url]) => (
        <link key={lang} rel="alternate" hrefLang={lang} href={url} />
      ))}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {faqJsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} /> : null}

      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-neutral-500">
        {breadcrumbItems.map((item, i) => (
          <span key={item.url}>
            {i > 0 ? " / " : ""}
            {item.name}
          </span>
        ))}
      </nav>

      <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">{page.title}</h1>
      {generated.content.intro ? <Markdown className="mt-4 text-neutral-700">{generated.content.intro}</Markdown> : null}

      {content.picks && content.picks.length > 0 ? (
        <section className="mt-6 space-y-3">
          <h2 className="text-lg font-semibold text-neutral-900">Top Picks</h2>
          <ol className="space-y-2">
            {content.picks.map((pick) => (
              <li key={pick.brandId} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3">
                <span className="font-medium text-neutral-900">
                  {pick.rank ? `#${pick.rank} ` : ""}
                  {pick.brandName}
                </span>
                {pick.affiliateUrl ? (
                  <AffiliateCtaLink
                    href={`/click/${pick.brandId}?destination=${encodeURIComponent(pick.affiliateUrl)}&page=${encodeURIComponent(page.id)}`}
                    brandId={pick.brandId}
                    pageId={page.id}
                    region={page.region.code}
                    ctaLocation="top-picks-list"
                    className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
                  >
                    Check price
                  </AffiliateCtaLink>
                ) : (
                  <span className="text-sm text-neutral-400">Offer unavailable</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {content.brand?.affiliateUrl ? (
        <div className="mt-6">
          <AffiliateCtaLink
            href={`/click/${content.brand.id}?destination=${encodeURIComponent(content.brand.affiliateUrl)}&page=${encodeURIComponent(page.id)}`}
            brandId={content.brand.id}
            pageId={page.id}
            region={page.region.code}
            ctaLocation="brand-review-cta"
            className="inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Check current offer
          </AffiliateCtaLink>
        </div>
      ) : null}

      <div className="mt-8 space-y-6">
        {generated.content.sections.map((section, i) => (
          <section key={i}>
            {section.level === 2 ? (
              <h2 className="text-lg font-semibold text-neutral-900">{section.heading}</h2>
            ) : (
              <h3 className="text-base font-semibold text-neutral-900">{section.heading}</h3>
            )}
            <Markdown className={MARKDOWN_CLASS}>{section.content}</Markdown>
          </section>
        ))}
      </div>

      {generated.content.pros && generated.content.cons ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Pros</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
              {generated.content.pros.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Cons</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
              {generated.content.cons.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {generated.content.comparison && generated.content.comparison.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-neutral-900">Comparison</h2>
          <ul className="mt-2 space-y-2">
            {generated.content.comparison.map((c, i) => (
              <li key={i} className="rounded-lg border border-neutral-200 p-3">
                <p className="font-medium text-neutral-900">{c.name}</p>
                {c.summary ? <p className="text-sm text-neutral-600">{c.summary}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {generated.content.faq && generated.content.faq.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-neutral-900">FAQ</h2>
          <dl className="mt-2 space-y-3">
            {generated.content.faq.map((f, i) => (
              <div key={i}>
                <dt className="font-medium text-neutral-900">{f.question}</dt>
                <dd>
                  <Markdown className={MARKDOWN_CLASS}>{f.answer}</Markdown>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {generated.content.conclusion ? <Markdown className="mt-8 text-neutral-700">{generated.content.conclusion}</Markdown> : null}

      <div className="mt-10 space-y-1 border-t border-neutral-200 pt-4 text-xs text-neutral-500">
        {content.disclosures.map((d, i) => (
          <p key={i}>
            {d.label ? <span className="font-medium">{d.label}: </span> : null}
            {d.text}
          </p>
        ))}
      </div>
    </article>
  );
}
