import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildCanonicalUrl } from "@/lib/seo/canonical";
import { pageTypeLabel } from "@/lib/types/page-type";
import type { StoredPageContent, StoredSeo, ValidationReport } from "@/lib/publishing/pipeline";
import { getPreviousVersion, buildPageDiff } from "@/lib/publishing/diff";
import { retryGscSubmissionAction } from "@/app/admin/(dashboard)/gsc/actions";
import { PublishPanel } from "./publish-panel";

export default async function AdminPageDetailPage({ params }: PageProps<"/admin/pages/[id]">) {
  const { id } = await params;
  const page = await prisma.generatedPage.findUnique({
    where: { id },
    include: { region: true, keyword: true, brand: true, generationJob: true, gscSubmissions: { orderBy: { queuedAt: "desc" } } },
  });
  if (!page) notFound();

  const content = page.content as unknown as StoredPageContent;
  const seo = page.seo as unknown as StoredSeo;
  const report = page.validationReport as unknown as ValidationReport | null;
  const canonicalUrl = buildCanonicalUrl(page.canonicalPath);
  const generated = content.generated;

  const [allVersions, previousVersion] = await Promise.all([
    prisma.generatedPage.findMany({
      where: { regionId: page.regionId, pageType: page.pageType, keywordId: page.keywordId, brandId: page.brandId },
      orderBy: { version: "desc" },
      select: { id: true, version: true, status: true, updatedAt: true },
    }),
    getPreviousVersion(page),
  ]);
  const diff = previousVersion ? buildPageDiff(previousVersion, page) : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          {page.region.code} · {pageTypeLabel(page.pageType)} · v{page.version} · {page.status}
        </p>
        <h1 className="text-lg font-semibold text-neutral-900">{page.title}</h1>
        <a href={canonicalUrl} target="_blank" rel="noreferrer" className="text-sm text-neutral-500 underline">
          {canonicalUrl}
        </a>
      </div>

      <PublishPanel pageId={page.id} isPublished={page.status === "PUBLISHED"} />

      {allVersions.length > 1 ? (
        <section className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-900">Version history</h2>
          <ul className="space-y-1 text-sm">
            {allVersions.map((v) => (
              <li key={v.id} className={v.id === page.id ? "font-medium text-neutral-900" : "text-neutral-600"}>
                {v.id === page.id ? (
                  <>
                    v{v.version} — {v.status} (viewing)
                  </>
                ) : (
                  <Link href={`/admin/pages/${v.id}`} className="underline">
                    v{v.version} — {v.status}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {diff ? (
        <section className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-900">
            Changes since v{diff.previousVersion}
          </h2>
          <table className="w-full text-sm">
            <tbody>
              {diff.fields
                .filter((f) => f.changed)
                .map((f) => (
                  <tr key={f.field} className="border-b border-neutral-100 align-top last:border-0">
                    <td className="w-40 py-1.5 pr-3 text-xs font-medium text-neutral-500">{f.field}</td>
                    <td className="py-1.5">
                      <p className="text-red-600 line-through">{f.previous || "(empty)"}</p>
                      <p className="text-green-700">{f.current || "(empty)"}</p>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {diff.sectionsChanged ? <p className="text-xs text-amber-600">Content sections changed — see the preview below.</p> : null}
          {!diff.fields.some((f) => f.changed) && !diff.sectionsChanged ? (
            <p className="text-sm text-neutral-500">No meaningful field changes detected versus the previous version.</p>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Validation report</h2>
        <p className="text-xs text-neutral-500">
          Uniqueness score: {page.uniquenessScore?.toFixed(2) ?? "—"} · Content hash: <code>{page.contentHash.slice(0, 12)}</code> · Request ID:{" "}
          {page.generationJob.requestId ?? "—"} · API version: {page.generationJob.apiVersion ?? "—"}
        </p>
        {generated.mock ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800">
            This page was generated in MOCK MODE — not real Content Generation Engine output.
          </p>
        ) : null}
        {report && report.issues.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-red-600">
            {report.issues.map((issue, i) => (
              <li key={i}>
                [{issue.code}] {issue.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-green-700">No validation issues.</p>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">SEO</h2>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-neutral-500">Title</dt>
            <dd>{seo.title}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Meta description</dt>
            <dd>{seo.description}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Canonical path</dt>
            <dd>{page.canonicalPath}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Keywords</dt>
            <dd>{seo.keywords.join(", ")}</dd>
          </div>
        </dl>
      </section>

      {content.disclosures.length > 0 ? (
        <section className="space-y-1 rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-900">Disclosures</h2>
          {content.disclosures.map((d, i) => (
            <p key={i} className="text-sm text-neutral-700">
              {d.label ? <span className="font-medium">{d.label}: </span> : null}
              {d.text}
            </p>
          ))}
        </section>
      ) : null}

      {content.picks && content.picks.length > 0 ? (
        <section className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-900">Picks / affiliate resolution</h2>
          <ul className="space-y-1 text-sm">
            {content.picks.map((pick) => (
              <li key={pick.brandId}>
                {pick.rank ? `#${pick.rank} ` : ""}
                {pick.brandName} —{" "}
                {pick.affiliateUrl ? (
                  <span className="text-green-700">{pick.affiliateUrl}</span>
                ) : (
                  <span className="text-amber-600">no affiliate mapping</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Content preview</h2>
        {generated.content.intro ? <p className="text-sm text-neutral-700">{generated.content.intro}</p> : null}
        {generated.content.sections.map((section, i) => (
          <div key={i}>
            <h3 className="text-sm font-semibold text-neutral-900">{section.heading}</h3>
            <p className="text-sm text-neutral-700">{section.content}</p>
          </div>
        ))}
        {generated.content.pros && generated.content.cons ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Pros</h3>
              <ul className="list-disc pl-5 text-sm text-neutral-700">
                {generated.content.pros.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Cons</h3>
              <ul className="list-disc pl-5 text-sm text-neutral-700">
                {generated.content.cons.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
        {generated.content.faq && generated.content.faq.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">FAQ</h3>
            <dl className="space-y-2">
              {generated.content.faq.map((f, i) => (
                <div key={i}>
                  <dt className="text-sm font-medium text-neutral-900">{f.question}</dt>
                  <dd className="text-sm text-neutral-700">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
        {generated.content.conclusion ? <p className="text-sm text-neutral-700">{generated.content.conclusion}</p> : null}
      </section>

      {page.gscSubmissions.length > 0 ? (
        <section className="space-y-1 rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-900">GSC submissions</h2>
          {page.gscSubmissions.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 text-sm text-neutral-700">
              <span>
                {s.status} — {s.url} {s.error ? `(${s.error})` : ""}
              </span>
              {s.status === "FAILED" ? (
                <form action={retryGscSubmissionAction.bind(null, s.id)}>
                  <button type="submit" className="text-xs text-neutral-600 underline">
                    Retry
                  </button>
                </form>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
