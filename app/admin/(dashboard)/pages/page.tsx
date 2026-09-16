import Link from "next/link";
import { prisma } from "@/lib/db";
import { pageTypeLabel } from "@/lib/types/page-type";

export default async function AdminPagesPage() {
  const pages = await prisma.generatedPage.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { region: true, keyword: true, brand: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Pages</h1>
        <p className="text-sm text-neutral-500">Every generated version, most recently updated first.</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs text-neutral-500">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Region</th>
              <th className="p-3">Type</th>
              <th className="p-3">Version</th>
              <th className="p-3">Status</th>
              <th className="p-3">Uniqueness</th>
              <th className="p-3">Updated</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id} className="border-b border-neutral-100 last:border-0">
                <td className="p-3 font-medium text-neutral-900">{page.title}</td>
                <td className="p-3">{page.region.code}</td>
                <td className="p-3 text-neutral-500">{pageTypeLabel(page.pageType)}</td>
                <td className="p-3">v{page.version}</td>
                <td className="p-3">
                  <StatusBadge status={page.status} />
                </td>
                <td className="p-3 text-xs text-neutral-500">{page.uniquenessScore?.toFixed(2) ?? "—"}</td>
                <td className="p-3 text-xs text-neutral-500">{page.updatedAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td className="p-3 text-right">
                  <Link href={`/admin/pages/${page.id}`} className="text-xs text-neutral-700 underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {pages.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-3 text-neutral-500">
                  No generated pages yet.
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
    DRAFT: "bg-neutral-100 text-neutral-700",
    GENERATED: "bg-blue-100 text-blue-700",
    READY_FOR_REVIEW: "bg-amber-100 text-amber-700",
    APPROVED: "bg-blue-100 text-blue-700",
    PUBLISHED: "bg-green-100 text-green-700",
    UNPUBLISHED: "bg-neutral-100 text-neutral-500",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs ${colors[status] ?? "bg-neutral-100 text-neutral-700"}`}>{status}</span>;
}
