"use client";

import { useActionState } from "react";
import { testConnectionAction, type TestConnectionState } from "./actions";

const initialState: TestConnectionState = {};

export function TestConnectionButton() {
  const [state, formAction, pending] = useActionState(testConnectionAction, initialState);

  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-900">Test Connection</h2>
      <p className="text-xs text-neutral-500">
        Makes a lightweight, non-billable reachability check — it never triggers a real content generation.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
      >
        {pending ? "Testing…" : "Test Connection"}
      </button>
      {state.result ? (
        <p className={`text-sm ${state.result.connected ? "text-green-700" : "text-red-600"}`}>
          {state.result.connected ? "Connected" : "Connection failed"} — {state.result.message} ({state.result.latencyMs}ms)
        </p>
      ) : null}
    </form>
  );
}
