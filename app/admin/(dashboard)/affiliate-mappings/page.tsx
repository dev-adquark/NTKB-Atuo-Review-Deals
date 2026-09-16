import { prisma } from "@/lib/db";
import { setAffiliateMappingAction } from "./actions";

export default async function AdminAffiliateMappingsPage() {
  const [brands, regions, mappings] = await Promise.all([
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.region.findMany({ orderBy: { code: "asc" } }),
    prisma.affiliateMapping.findMany(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Affiliate Mappings</h1>
        <p className="text-sm text-neutral-500">
          One URL per brand per region. Admin mappings here always take priority and are never overwritten automatically.
          Leave a field blank and save to remove a mapping — publishing is blocked for any monetized page without one.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs text-neutral-500">
            <tr>
              <th className="p-3">Brand</th>
              {regions.map((region) => (
                <th key={region.id} className="p-3">
                  {region.code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => (
              <tr key={brand.id} className="border-b border-neutral-100 last:border-0">
                <td className="p-3 font-medium text-neutral-900">{brand.name}</td>
                {regions.map((region) => {
                  const mapping = mappings.find((m) => m.brandId === brand.id && m.regionId === region.id);
                  return (
                    <td key={region.id} className="p-3">
                      <form action={setAffiliateMappingAction.bind(null, brand.id, region.id)} className="flex items-center gap-1">
                        <input
                          name="url"
                          type="url"
                          defaultValue={mapping?.url ?? ""}
                          placeholder="https://…"
                          className="w-40 rounded-md border border-neutral-300 px-2 py-1 text-xs"
                        />
                        <button type="submit" className="text-xs text-neutral-600 underline">
                          Save
                        </button>
                      </form>
                    </td>
                  );
                })}
              </tr>
            ))}
            {brands.length === 0 ? (
              <tr>
                <td colSpan={regions.length + 1} className="p-3 text-neutral-500">
                  Add brands first.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
