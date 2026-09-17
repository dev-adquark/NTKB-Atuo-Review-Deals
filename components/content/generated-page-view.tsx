import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd } from "@/lib/seo/jsonld";
import { buildCanonicalUrl } from "@/lib/seo/canonical";
import { getHreflangAlternates } from "@/lib/seo/hreflang";
import { AffiliateCtaLink } from "@/components/affiliate/affiliate-cta-link";
import { Markdown } from "@/components/content/markdown";
import { ArticleFaq } from "@/components/content/article-faq";
import { ArticleImage } from "@/components/content/article-image";
import { Reveal } from "@/components/motion/reveal";
import { PAGE_TYPE_LABEL } from "@/lib/content/page-type-label";
import type { StoredPageContent } from "@/lib/publishing/pipeline";
import type { GeneratedPage, Region, Brand, Keyword } from "@/app/generated/prisma/client";

const MARKDOWN_CLASS =
  "prose-content mt-2 text-muted [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-primary [&_a]:underline [&_blockquote]:mt-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border-strong [&_blockquote]:pl-3 [&_blockquote]:text-muted [&_p+p]:mt-3";

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
  const hasDisclosure = content.disclosures.length > 0;

  return (
    <article>
      {Object.entries(hreflang).map(([lang, url]) => (
        <link key={lang} rel="alternate" hrefLang={lang} href={url} />
      ))}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {faqJsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} /> : null}

      <header className="relative overflow-hidden border-b border-border-default bg-surface">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 left-1/3 h-72 w-72 rounded-full bg-glow-a/15 blur-[100px]" />
        </div>
        <div className="mx-auto max-w-3xl px-4 py-12">
          <Reveal>
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
              {breadcrumbItems.map((item, i) => (
                <span key={item.url} className="flex items-center gap-1.5">
                  {i > 0 ? <span aria-hidden>/</span> : null}
                  {item.name}
                </span>
              ))}
            </nav>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {PAGE_TYPE_LABEL[page.pageType] ?? page.pageType}
              </span>
              <span className="rounded-full border border-border-default px-2.5 py-1 text-xs font-medium text-muted">
                {page.region.name}
              </span>
              {hasDisclosure ? (
                <span className="rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
                  Contains affiliate links
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
              {page.title}
            </h1>
            {generated.content.intro ? <Markdown className={MARKDOWN_CLASS}>{generated.content.intro}</Markdown> : null}
          </Reveal>
        </div>
      </header>

      {content.image ? <ArticleImage image={content.image} /> : null}

      <div className="mx-auto max-w-3xl px-4 py-10">
        {content.picks && content.picks.length > 0 ? (
          <Reveal as="section" className="rounded-2xl border border-border-default bg-surface p-5">
            <h2 className="font-display text-lg font-medium text-foreground">Top Picks</h2>
            <ol className="mt-3 space-y-2">
              {content.picks.map((pick) => (
                <li
                  key={pick.brandId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border-default bg-background p-3"
                >
                  <span className="font-medium text-foreground">
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
                      className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
                    >
                      Check price
                    </AffiliateCtaLink>
                  ) : (
                    <span className="text-sm text-muted">Offer unavailable</span>
                  )}
                </li>
              ))}
            </ol>
          </Reveal>
        ) : null}

        {content.brand?.affiliateUrl ? (
          <Reveal className="mt-6">
            <AffiliateCtaLink
              href={`/click/${content.brand.id}?destination=${encodeURIComponent(content.brand.affiliateUrl)}&page=${encodeURIComponent(page.id)}`}
              brandId={content.brand.id}
              pageId={page.id}
              region={page.region.code}
              ctaLocation="brand-review-cta"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              Check current offer
              <span aria-hidden>→</span>
            </AffiliateCtaLink>
          </Reveal>
        ) : null}

        <div className="mt-8 space-y-8">
          {generated.content.sections.map((section, i) => (
            <Reveal key={i} as="section" delay={Math.min(i * 0.03, 0.15)}>
              {section.level === 2 ? (
                <h2 className="font-display text-xl font-medium text-foreground">{section.heading}</h2>
              ) : (
                <h3 className="font-display text-lg font-medium text-foreground">{section.heading}</h3>
              )}
              <Markdown className={MARKDOWN_CLASS}>{section.content}</Markdown>
            </Reveal>
          ))}
        </div>

        {generated.content.pros && generated.content.cons ? (
          <Reveal as="section" className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-success/30 bg-success/5 p-5">
              <h2 className="font-display text-base font-medium text-foreground">Pros</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                {generated.content.pros.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden className="text-success">
                      +
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border-strong bg-surface p-5">
              <h2 className="font-display text-base font-medium text-foreground">Cons</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                {generated.content.cons.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden className="text-muted">
                      −
                    </span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ) : null}

        {generated.content.comparison && generated.content.comparison.length > 0 ? (
          <Reveal as="section" className="mt-10">
            <h2 className="font-display text-xl font-medium text-foreground">Comparison</h2>
            <ul className="mt-4 space-y-3">
              {generated.content.comparison.map((c, i) => (
                <li key={i} className="rounded-2xl border border-border-default bg-surface p-4">
                  <p className="font-medium text-foreground">{c.name}</p>
                  {c.summary ? <p className="mt-1 text-sm text-muted">{c.summary}</p> : null}
                </li>
              ))}
            </ul>
          </Reveal>
        ) : null}

        {generated.content.faq && generated.content.faq.length > 0 ? (
          <Reveal as="section" className="mt-10">
            <h2 className="font-display text-xl font-medium text-foreground">FAQ</h2>
            <div className="mt-4">
              <ArticleFaq items={generated.content.faq} />
            </div>
          </Reveal>
        ) : null}

        {generated.content.conclusion ? (
          <Reveal as="section" className="mt-10">
            <Markdown className={MARKDOWN_CLASS}>{generated.content.conclusion}</Markdown>
          </Reveal>
        ) : null}

        {hasDisclosure ? (
          <div className="mt-12 space-y-1.5 rounded-2xl border border-border-default bg-surface p-5 text-xs leading-relaxed text-muted">
            {content.disclosures.map((d, i) => (
              <p key={i}>
                {d.label ? <span className="font-medium text-foreground">{d.label}: </span> : null}
                {d.text}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
