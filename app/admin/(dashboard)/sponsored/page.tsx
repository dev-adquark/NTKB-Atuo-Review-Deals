import { prisma } from "@/lib/db";
import { createSponsoredPlacementAction, toggleSponsoredPlacementAction } from "./actions";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function AdminSponsoredPage() {
  const [placements, brands, regions] = await Promise.all([
    prisma.sponsoredPlacement.findMany({ include: { brand: true, region: true }, orderBy: { createdAt: "desc" } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.region.findMany({ orderBy: { code: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Sponsored Placements</h1>
        <p className="text-sm text-neutral-500">
          Every sponsored placement requires an explicit disclosure. Pages cannot publish sponsored content without one.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs text-neutral-500">
            <tr>
              <th className="p-3">Sponsor</th>
              <th className="p-3">Brand</th>
              <th className="p-3">Region</th>
              <th className="p-3">Window</th>
              <th className="p-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {placements.map((placement) => (
              <tr key={placement.id} className="border-b border-neutral-100 last:border-0">
                <td className="p-3 font-medium text-neutral-900">{placement.sponsorName}</td>
                <td className="p-3">{placement.brand.name}</td>
                <td className="p-3">{placement.region.code}</td>
                <td className="p-3 text-xs text-neutral-500">
                  {toDateInputValue(placement.startDate)} → {toDateInputValue(placement.endDate)}
                </td>
                <td className="p-3">
                  <form action={toggleSponsoredPlacementAction.bind(null, placement.id)}>
                    <input type="hidden" name="active" value={placement.active ? "" : "on"} />
                    <button type="submit" className="text-xs underline">
                      {placement.active ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {placements.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-3 text-neutral-500">
                  No sponsored placements yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <form action={createSponsoredPlacementAction} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Add sponsored placement</h2>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Sponsor name" name="sponsorName" />
          <Field label="Sponsor label" name="sponsorLabel" placeholder="Sponsored — Brand Spotlight" />
          <div>
            <p className="text-xs text-neutral-500">Brand</p>
            <select name="brandId" required className="rounded-md border border-neutral-300 px-2 py-2 text-sm">
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Region</p>
            <select name="regionId" required className="rounded-md border border-neutral-300 px-2 py-2 text-sm">
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code}
                </option>
              ))}
            </select>
          </div>
          <Field label="Link" name="link" placeholder="https://…" type="url" />
          <Field label="CTA label (optional)" name="ctaLabel" />
          <Field label="Image URL (optional)" name="imageUrl" />
          <Field label="Start date" name="startDate" type="date" />
          <Field label="End date" name="endDate" type="date" />
        </div>
        <div>
          <p className="text-xs text-neutral-500">Disclosure (required, shown to visitors)</p>
          <input
            name="disclosure"
            required
            placeholder="This is a paid partnership with Example Brand."
            className="w-full rounded-md border border-neutral-300 px-2 py-2 text-sm"
          />
        </div>
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Add
        </button>
      </form>
    </div>
  );
}

function Field({ label, name, placeholder, type }: { label: string; name: string; placeholder?: string; type?: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <input name={name} type={type ?? "text"} placeholder={placeholder} className="rounded-md border border-neutral-300 px-2 py-2 text-sm" />
    </div>
  );
}
