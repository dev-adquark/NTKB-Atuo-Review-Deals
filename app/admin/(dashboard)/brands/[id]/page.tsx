import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updateBrandAction, setBrandRankingAction } from "../actions";

export default async function AdminBrandDetailPage({ params }: PageProps<"/admin/brands/[id]">) {
  const { id } = await params;
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) notFound();

  const regions = await prisma.region.findMany({ orderBy: { code: "asc" } });
  const rankings = await prisma.brandRanking.findMany({ where: { brandId: id } });
  const mappings = await prisma.affiliateMapping.findMany({ where: { brandId: id } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">{brand.name}</h1>
        <p className="text-sm text-neutral-500">Brand details, regional ranking, and affiliate mapping status.</p>
      </div>

      <form action={updateBrandAction.bind(null, brand.id)} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Details</h2>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Name" name="name" defaultValue={brand.name} />
          <Field label="Slug" name="slug" defaultValue={brand.slug} />
          <Field label="Logo URL" name="logoUrl" defaultValue={brand.logoUrl ?? ""} />
          <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            Save
          </button>
        </div>
        <Field label="Description" name="description" defaultValue={brand.description ?? ""} full />
      </form>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs text-neutral-500">
            <tr>
              <th className="p-3">Region</th>
              <th className="p-3">Rank</th>
              <th className="p-3">Affiliate mapping</th>
            </tr>
          </thead>
          <tbody>
            {regions.map((region) => {
              const ranking = rankings.find((r) => r.regionId === region.id);
              const mapping = mappings.find((m) => m.regionId === region.id);
              return (
                <tr key={region.id} className="border-b border-neutral-100 last:border-0">
                  <td className="p-3 font-medium">{region.code}</td>
                  <td className="p-3">
                    <form action={setBrandRankingAction.bind(null, brand.id, region.id)} className="flex items-center gap-2">
                      <input
                        name="rank"
                        type="number"
                        min={1}
                        defaultValue={ranking?.rank ?? ""}
                        placeholder="—"
                        className="w-16 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900"
                      />
                      <button type="submit" className="text-xs text-neutral-600 underline">
                        Save
                      </button>
                    </form>
                  </td>
                  <td className="p-3">
                    {mapping && mapping.active ? (
                      <span className="text-xs text-green-700">Mapped ({mapping.source})</span>
                    ) : (
                      <span className="text-xs text-amber-600">Not mapped — set it on Affiliate Mappings</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, name, defaultValue, full }: { label: string; name: string; defaultValue?: string; full?: boolean }) {
  return (
    <div className={full ? "w-full" : undefined}>
      <p className="text-xs text-neutral-500">{label}</p>
      <input
        name={name}
        defaultValue={defaultValue}
        className={`rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 ${full ? "w-full" : ""}`}
      />
    </div>
  );
}
