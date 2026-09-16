"use client";

import { useActionState, useMemo, useState } from "react";
import { triggerGenerationAction, type GenerationFormState } from "./actions";

interface RegionOption {
  id: string;
  code: string;
}
interface KeywordOption {
  id: string;
  text: string;
  regionId: string;
  pageType: string;
}
interface BrandOption {
  id: string;
  name: string;
}

const initialState: GenerationFormState = {};

export function GenerationForm({
  regions,
  keywords,
  brands,
}: {
  regions: RegionOption[];
  keywords: KeywordOption[];
  brands: BrandOption[];
}) {
  const [state, formAction, pending] = useActionState(triggerGenerationAction, initialState);
  const [regionId, setRegionId] = useState(regions[0]?.id ?? "");
  const [pageType, setPageType] = useState<"KEYWORD_REVIEW" | "BRAND_REVIEW" | "TOP_PICKS">("KEYWORD_REVIEW");

  const filteredKeywords = useMemo(
    () => keywords.filter((k) => k.regionId === regionId && k.pageType === pageType),
    [keywords, regionId, pageType],
  );

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-xs text-neutral-500">Region</p>
          <select
            name="regionId"
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-2 text-sm"
          >
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-xs text-neutral-500">Page type</p>
          <select
            name="pageType"
            value={pageType}
            onChange={(e) => setPageType(e.target.value as typeof pageType)}
            className="rounded-md border border-neutral-300 px-2 py-2 text-sm"
          >
            <option value="KEYWORD_REVIEW">Keyword Review Landing</option>
            <option value="BRAND_REVIEW">Brand Review</option>
            <option value="TOP_PICKS">Top Picks / Deal Roundup</option>
          </select>
        </div>

        {pageType === "BRAND_REVIEW" ? (
          <div>
            <p className="text-xs text-neutral-500">Brand</p>
            <select name="brandId" required className="rounded-md border border-neutral-300 px-2 py-2 text-sm">
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <p className="text-xs text-neutral-500">Keyword</p>
            <select name="keywordId" required className="rounded-md border border-neutral-300 px-2 py-2 text-sm">
              {filteredKeywords.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.text}
                </option>
              ))}
            </select>
            {filteredKeywords.length === 0 ? (
              <p className="mt-1 text-xs text-amber-600">No matching keywords for this region/page type.</p>
            ) : null}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          {pending ? "Generating…" : "Generate"}
        </button>
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
    </form>
  );
}
