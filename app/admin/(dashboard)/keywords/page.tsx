import { prisma } from "@/lib/db";
import { pageTypeLabel } from "@/lib/types/page-type";
import { createKeywordAction, updateKeywordStatusAction } from "./actions";

export default async function AdminKeywordsPage() {
  const [keywords, regions, brands] = await Promise.all([
    prisma.keyword.findMany({ include: { region: true }, orderBy: [{ regionId: "asc" }, { priority: "desc" }] }),
    prisma.region.findMany({ orderBy: { code: "asc" } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Keywords</h1>
        <p className="text-sm text-neutral-500">Each keyword belongs to one region and one page type.</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs text-neutral-500">
            <tr>
              <th className="p-3">Keyword</th>
              <th className="p-3">Region</th>
              <th className="p-3">Page type</th>
              <th className="p-3">Priority</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {keywords.map((keyword) => (
              <tr key={keyword.id} className="border-b border-neutral-100 last:border-0">
                <td className="p-3 font-medium text-neutral-900">{keyword.text}</td>
                <td className="p-3">{keyword.region.code}</td>
                <td className="p-3 text-neutral-500">{pageTypeLabel(keyword.pageType)}</td>
                <td className="p-3">{keyword.priority}</td>
                <td className="p-3">
                  <form action={updateKeywordStatusAction.bind(null, keyword.id)} className="flex items-center gap-1">
                    <select name="status" defaultValue={keyword.status} className="rounded-md border border-neutral-300 px-2 py-1 text-xs">
                      <option value="ACTIVE">Active</option>
                      <option value="PAUSED">Paused</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                    <button type="submit" className="text-xs text-neutral-600 underline">
                      Save
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {keywords.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-3 text-neutral-500">
                  No keywords yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <form action={createKeywordAction} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Add keyword</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="text-xs text-neutral-500">Keyword</p>
            <input name="text" required placeholder="best password managers" className="rounded-md border border-neutral-300 px-2 py-2 text-sm" />
          </div>
          <div>
            <p className="text-xs text-neutral-500">Region</p>
            <select name="regionId" required className="rounded-md border border-neutral-300 px-2 py-2 text-sm">
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Page type</p>
            <select name="pageType" required className="rounded-md border border-neutral-300 px-2 py-2 text-sm">
              <option value="KEYWORD_REVIEW">Keyword Review Landing</option>
              <option value="TOP_PICKS">Top Picks / Deal Roundup</option>
            </select>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Category</p>
            <input name="category" className="rounded-md border border-neutral-300 px-2 py-2 text-sm" />
          </div>
          <div>
            <p className="text-xs text-neutral-500">Priority</p>
            <input name="priority" type="number" defaultValue={0} className="w-20 rounded-md border border-neutral-300 px-2 py-2 text-sm" />
          </div>
          <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            Add
          </button>
        </div>
        <div>
          <p className="text-xs text-neutral-500">Target brands (for Top Picks / comparisons)</p>
          <div className="mt-1 flex flex-wrap gap-3">
            {brands.map((brand) => (
              <label key={brand.id} className="flex items-center gap-1.5 text-sm text-neutral-700">
                <input type="checkbox" name="targetBrandIds" value={brand.id} className="h-4 w-4" />
                {brand.name}
              </label>
            ))}
            {brands.length === 0 ? <p className="text-sm text-neutral-500">No brands yet.</p> : null}
          </div>
        </div>
      </form>
    </div>
  );
}
