import Link from "next/link";
import { searchAdminEntities } from "@/lib/search/search";

export default async function AdminSearchPage({ searchParams }: PageProps<"/admin/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const results = query ? await searchAdminEntities(query) : { pages: [], keywords: [], brands: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Search</h1>
        <p className="text-sm text-neutral-500">Searches pages (any status), keywords, and brands.</p>
      </div>

      <form action="/admin/search" method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search…"
          className="w-full max-w-md rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Search
        </button>
      </form>

      {query ? (
        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-neutral-900">Pages ({results.pages.length})</h2>
            <ul className="mt-2 space-y-1">
              {results.pages.map((p) => (
                <li key={p.id} className="text-sm">
                  <Link href={`/admin/pages/${p.id}`} className="text-neutral-700 underline">
                    {p.title}
                  </Link>
                  <span className="ml-2 text-xs text-neutral-400">
                    {p.regionCode} · {p.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-neutral-900">Keywords ({results.keywords.length})</h2>
            <ul className="mt-2 space-y-1">
              {results.keywords.map((k) => (
                <li key={k.id} className="text-sm text-neutral-700">
                  {k.text} <span className="ml-2 text-xs text-neutral-400">{k.regionCode}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-neutral-900">Brands ({results.brands.length})</h2>
            <ul className="mt-2 space-y-1">
              {results.brands.map((b) => (
                <li key={b.id} className="text-sm">
                  <Link href={`/admin/brands/${b.id}`} className="text-neutral-700 underline">
                    {b.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
