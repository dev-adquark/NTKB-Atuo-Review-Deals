"use client";

import { useActionState } from "react";
import { publishPageAction, unpublishPageAction, regeneratePageAction, type PublishState } from "../actions";

const initialState: PublishState = {};

export function PublishPanel({ pageId, isPublished }: { pageId: string; isPublished: boolean }) {
  const [state, formAction, pending] = useActionState(publishPageAction.bind(null, pageId), initialState);

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <form action={formAction}>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {pending ? "Publishing…" : "Publish"}
          </button>
        </form>
        {isPublished ? (
          <form action={unpublishPageAction.bind(null, pageId)}>
            <button type="submit" className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
              Unpublish
            </button>
          </form>
        ) : null}
        <form action={regeneratePageAction.bind(null, pageId)}>
          <button type="submit" className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Regenerate (new version)
          </button>
        </form>
      </div>

      {state.gates ? (
        <ul className="space-y-1 text-sm">
          {state.gates.map((gate) => (
            <li key={gate.key} className={gate.passed ? "text-green-700" : "text-red-600"}>
              [{gate.passed ? "✓" : "✗"}] {gate.label}
              {gate.detail ? ` — ${gate.detail}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
    </div>
  );
}
