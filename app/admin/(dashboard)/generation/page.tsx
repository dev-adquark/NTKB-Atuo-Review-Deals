import Link from "next/link";
import { prisma } from "@/lib/db";
import { pageTypeLabel } from "@/lib/types/page-type";
import { GenerationForm } from "./generation-form";
import { BatchGenerationForm } from "./batch-generation-form";

export default async function AdminGenerationPage() {
  const [regions, keywords, brands, jobs] = await Promise.all([
    prisma.region.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    prisma.keyword.findMany({ where: { status: "ACTIVE" }, select: { id: true, text: true, regionId: true, pageType: true } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.generationJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { region: true, keyword: true, brand: true, generatedPages: { select: { id: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Generation</h1>
        <p className="text-sm text-neutral-500">Calls the external Content Generation Engine and runs it through validation.</p>
      </div>

      <GenerationForm regions={regions} keywords={keywords} brands={brands} />
      <BatchGenerationForm regions={regions} keywords={keywords} />

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs text-neutral-500">
            <tr>
              <th className="p-3">Subject</th>
              <th className="p-3">Region</th>
              <th className="p-3">Page type</th>
              <th className="p-3">Status</th>
              <th className="p-3">Request ID</th>
              <th className="p-3">Created</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-b border-neutral-100 last:border-0">
                <td className="p-3 font-medium text-neutral-900">{job.brand?.name ?? job.keyword?.text ?? "—"}</td>
                <td className="p-3">{job.region.code}</td>
                <td className="p-3 text-neutral-500">{pageTypeLabel(job.pageType)}</td>
                <td className="p-3">
                  <StatusBadge status={job.status} />
                </td>
                <td className="p-3 text-xs text-neutral-500">{job.requestId ?? "—"}</td>
                <td className="p-3 text-xs text-neutral-500">{job.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td className="p-3 text-right">
                  {job.generatedPages[0] ? (
                    <Link href={`/admin/pages/${job.generatedPages[0].id}`} className="text-xs text-neutral-700 underline">
                      View
                    </Link>
                  ) : null}
                </td>
              </tr>
            ))}
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-3 text-neutral-500">
                  No generation jobs yet.
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
    GENERATING: "bg-blue-100 text-blue-700",
    GENERATED: "bg-green-100 text-green-700",
    VALIDATING: "bg-blue-100 text-blue-700",
    FAILED: "bg-red-100 text-red-700",
    REJECTED: "bg-amber-100 text-amber-700",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs ${colors[status] ?? "bg-neutral-100 text-neutral-700"}`}>{status}</span>;
}
