import { prisma } from "@/lib/db";

async function getCounts() {
  const [published, drafts, failedJobs, gscQueued, gscFailed, affiliateMappings, regions, brands, keywords] =
    await Promise.all([
      prisma.generatedPage.count({ where: { status: "PUBLISHED" } }),
      prisma.generatedPage.count({ where: { status: { in: ["DRAFT", "GENERATED", "READY_FOR_REVIEW"] } } }),
      prisma.generationJob.count({ where: { status: "FAILED" } }),
      prisma.gSCSubmission.count({ where: { status: "QUEUED" } }),
      prisma.gSCSubmission.count({ where: { status: "FAILED" } }),
      prisma.affiliateMapping.count(),
      prisma.region.count(),
      prisma.brand.count(),
      prisma.keyword.count(),
    ]);
  return { published, drafts, failedJobs, gscQueued, gscFailed, affiliateMappings, regions, brands, keywords };
}

export default async function AdminDashboardPage() {
  const counts = await getCounts();

  const cards: Array<{ label: string; value: number }> = [
    { label: "Published pages", value: counts.published },
    { label: "Drafts / in review", value: counts.drafts },
    { label: "Failed generations", value: counts.failedJobs },
    { label: "GSC queued", value: counts.gscQueued },
    { label: "GSC failed", value: counts.gscFailed },
    { label: "Affiliate mappings", value: counts.affiliateMappings },
    { label: "Regions", value: counts.regions },
    { label: "Brands", value: counts.brands },
    { label: "Keywords", value: counts.keywords },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-neutral-900">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-500">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
