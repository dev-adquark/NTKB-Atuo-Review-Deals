"use client";

import { useActionState } from "react";
import { refreshEligiblePagesAction, type RefreshState } from "./actions";

const initialState: RefreshState = {};

export function RefreshAllButton() {
  const [state, formAction, pending] = useActionState(refreshEligiblePagesAction, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {pending ? "Refreshing…" : "Refresh eligible pages now"}
      </button>
      {state.summary ? (
        <p className="text-sm text-neutral-700">
          Checked {state.summary.checked} · {state.summary.succeeded} refreshed · {state.summary.failed} kept the existing
          published version (failed validation/publish gates).
        </p>
      ) : null}
    </form>
  );
}
