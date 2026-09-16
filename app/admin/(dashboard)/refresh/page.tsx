import { getRefreshEligiblePages } from "@/lib/publishing/refresh";
import { getOrCreatePlatformSettings } from "@/lib/settings";
import { pageTypeLabel } from "@/lib/types/page-type";
import { RefreshAllButton } from "./refresh-button";
import { refreshSinglePageAction } from "./actions";

export default async function AdminRefreshPage() {
  const settings = await getOrCreatePlatformSettings();
  const eligible = await getRefreshEligiblePages(50);
  const cronConfigured = Boolean(process.env.CONTENT_REFRESH_SECRET);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Content Freshness</h1>
        <p className="text-sm text-neutral-500">
          Pages published more than {settings.refreshEligibleDays} days ago are eligible for a refresh. A refresh
          generates and validates a new version and only replaces the live page if every publish gate passes — a
          failed refresh always leaves the current published version untouched and live.
        </p>
      </div>

      {!settings.refreshEnabled ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Scheduled (cron) refresh is disabled in Settings — manual refresh below still works regardless.
        </p>
      ) : null}
      {!cronConfigured ? (
        <p className="rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
          CONTENT_REFRESH_SECRET is not set, so an external scheduler (e.g. Vercel Cron) can&rsquo;t call POST
          /api/refresh yet. Manual refresh below doesn&rsquo;t need it.
        </p>
      ) : null}

      <RefreshAllButton />

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs text-neutral-500">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Region</th>
              <th className="p-3">Type</th>
              <th className="p-3">Published</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {eligible.map((page) => (
              <tr key={page.id} className="border-b border-neutral-100 last:border-0">
                <td className="p-3 font-medium text-neutral-900">{page.title}</td>
                <td className="p-3">{page.region.code}</td>
                <td className="p-3 text-neutral-500">{pageTypeLabel(page.pageType)}</td>
                <td className="p-3 text-xs text-neutral-500">{page.publishedAt?.toISOString().slice(0, 10)}</td>
                <td className="p-3 text-right">
                  <form action={refreshSinglePageAction.bind(null, page.id)}>
                    <button type="submit" className="text-xs text-neutral-700 underline">
                      Refresh
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {eligible.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-3 text-neutral-500">
                  No pages are currently eligible for refresh.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
