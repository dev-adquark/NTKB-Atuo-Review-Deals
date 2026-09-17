"use client";

import { useActionState, useMemo, useState } from "react";
import { triggerBatchGenerationAction, type BatchGenerationState } from "./actions";

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

const initialState: BatchGenerationState = {};

export function BatchGenerationForm({ regions, keywords }: { regions: RegionOption[]; keywords: KeywordOption[] }) {
  const [state, formAction, pending] = useActionState(triggerBatchGenerationAction, initialState);
  const [regionId, setRegionId] = useState(regions[0]?.id ?? "");
  const [pageType, setPageType] = useState<"KEYWORD_REVIEW" | "TOP_PICKS">("KEYWORD_REVIEW");

  const filteredKeywords = useMemo(
    () => keywords.filter((k) => k.regionId === regionId && k.pageType === pageType),
    [keywords, regionId, pageType],
  );

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-900">Batch generate</h2>
      <p className="text-xs text-neutral-500">
        Generates one independent job per selected keyword. One failure never blocks the others.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-xs text-neutral-500">Region</p>
          <select
            name="regionId"
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-900 placeholder:text-neutral-400"
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
            className="rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-900 placeholder:text-neutral-400"
          >
            <option value="KEYWORD_REVIEW">Keyword Review Landing</option>
            <option value="TOP_PICKS">Top Picks / Deal Roundup</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          {pending ? "Generating…" : "Generate selected"}
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
        {filteredKeywords.map((k) => (
          <label key={k.id} className="flex items-center gap-1.5 text-sm text-neutral-700">
            <input type="checkbox" name="keywordIds" value={k.id} className="h-4 w-4" />
            {k.text}
          </label>
        ))}
        {filteredKeywords.length === 0 ? <p className="text-xs text-amber-600">No matching keywords for this region/page type.</p> : null}
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.summary ? (
        <p className="text-sm text-neutral-700">
          {state.summary.succeeded}/{state.summary.total} succeeded
          {state.summary.failed > 0 ? `, ${state.summary.failed} failed or need review — see Generation history below` : ""}.
        </p>
      ) : null}
    </form>
  );
}
