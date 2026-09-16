import { prisma } from "@/lib/db";
import { retryGscSubmissionAction, retryAllFailedGscSubmissionsAction } from "./actions";

export default async function AdminGscPage() {
  const submissions = await prisma.gSCSubmission.findMany({
    orderBy: { queuedAt: "desc" },
    take: 100,
    include: { generatedPage: { select: { title: true } } },
  });

  const gscConfigured = Boolean(
    process.env.GSC_CLIENT_ID && process.env.GSC_CLIENT_SECRET && process.env.GSC_REFRESH_TOKEN && process.env.GSC_PROPERTY_URL,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Google Search Console</h1>
        <p className="text-sm text-neutral-500">
          Tracks URL submission status only. A successful submission means Google was notified — it does not mean the
          page has been indexed; indexing remains controlled by Google.
        </p>
      </div>

      {!gscConfigured ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          GSC credentials are not configured. Submissions will be queued but marked FAILED with a clear reason until
          GSC_CLIENT_ID, GSC_CLIENT_SECRET, GSC_REFRESH_TOKEN, and GSC_PROPERTY_URL are set.
        </p>
      ) : null}

      {submissions.some((s) => s.status === "FAILED") ? (
        <form action={retryAllFailedGscSubmissionsAction}>
          <button type="submit" className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50">
            Retry all failed
          </button>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs text-neutral-500">
            <tr>
              <th className="p-3">Page</th>
              <th className="p-3">URL</th>
              <th className="p-3">Status</th>
              <th className="p-3">Retries</th>
              <th className="p-3">Error</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission) => (
              <tr key={submission.id} className="border-b border-neutral-100 last:border-0">
                <td className="p-3 font-medium text-neutral-900">{submission.generatedPage.title}</td>
                <td className="p-3 text-xs text-neutral-500">{submission.url}</td>
                <td className="p-3">
                  <StatusBadge status={submission.status} />
                </td>
                <td className="p-3">{submission.retryCount}</td>
                <td className="p-3 text-xs text-red-600">{submission.error ?? "—"}</td>
                <td className="p-3 text-right">
                  {submission.status === "FAILED" ? (
                    <form action={retryGscSubmissionAction.bind(null, submission.id)}>
                      <button type="submit" className="text-xs text-neutral-700 underline">
                        Retry
                      </button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-3 text-neutral-500">
                  No submissions yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    QUEUED: "bg-neutral-100 text-neutral-700",
    SUCCESS: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs ${colors[status] ?? "bg-neutral-100 text-neutral-700"}`}>{status}</span>;
}
