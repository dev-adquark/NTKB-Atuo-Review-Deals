import type { Metadata } from "next";
import Link from "next/link";
import { searchPublishedPages } from "@/lib/search/search";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const results = query ? await searchPublishedPages(query) : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Reveal>
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Search</span>
        <h1 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
          Find a review or deal
        </h1>
      </Reveal>

      <form action="/search" method="get" className="mt-6 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search reviews and deals…"
          className="w-full rounded-full border border-border-default bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
        >
          Search
        </button>
      </form>

      {query ? (
        <div className="mt-8">
          <p className="text-sm text-muted">
            {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
          </p>

          {results.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {results.map((r) => (
                <li key={r.id}>
                  <Link
                    href={r.canonicalPath}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-border-default bg-surface p-4 transition-shadow hover:shadow-[0_20px_40px_-25px_rgba(15,23,42,0.25)]"
                  >
                    <span className="font-medium text-foreground">{r.title}</span>
                    <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted">
                      {r.regionCode}
                      <span aria-hidden className="text-primary transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-border-strong bg-surface p-8 text-center">
              <p className="text-sm text-muted">No published pages matched your search.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
