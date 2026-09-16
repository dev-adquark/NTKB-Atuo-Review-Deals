import type { Metadata } from "next";
import Link from "next/link";
import { searchPublishedPages } from "@/lib/search/search";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const results = query ? await searchPublishedPages(query) : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-neutral-900">Search</h1>
      <form action="/search" method="get" className="mt-4 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search reviews and deals…"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Search
        </button>
      </form>

      {query ? (
        <div className="mt-6 space-y-2">
          <p className="text-sm text-neutral-500">
            {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
          </p>
          <ul className="space-y-2">
            {results.map((r) => (
              <li key={r.id}>
                <Link href={r.canonicalPath} className="text-neutral-700 underline">
                  {r.title}
                </Link>
                <span className="ml-2 text-xs text-neutral-400">{r.regionCode}</span>
              </li>
            ))}
          </ul>
          {results.length === 0 ? <p className="text-sm text-neutral-500">No published pages matched your search.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
