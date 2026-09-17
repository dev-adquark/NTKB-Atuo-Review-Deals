import { prisma } from "@/lib/db";
import { REGION_CODES } from "@/lib/types/region";
import { createRegionAction, updateRegionAction } from "./actions";

export default async function AdminRegionsPage() {
  const regions = await prisma.region.findMany({ orderBy: { code: "asc" } });
  const usedCodes = new Set(regions.map((r) => r.code));
  const availableCodes = REGION_CODES.filter((code) => !usedCodes.has(code));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Regions</h1>
        <p className="text-sm text-neutral-500">US, EU, AU and IN are the supported regions.</p>
      </div>

      <div className="space-y-3">
        {regions.map((region) => (
          <form
            key={region.id}
            action={updateRegionAction.bind(null, region.id)}
            className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4"
          >
            <div className="w-16">
              <p className="text-xs text-neutral-500">Code</p>
              <p className="text-sm font-medium">{region.code}</p>
            </div>
            <Field label="Name" name="name" defaultValue={region.name} />
            <Field label="Language (BCP-47)" name="language" defaultValue={region.language} />
            <Field label="URL prefix" name="urlPrefix" defaultValue={region.urlPrefix} />
            <Field label="Currency" name="currency" defaultValue={region.currency} />
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" name="active" defaultChecked={region.active} className="h-4 w-4" />
              Active
            </label>
            <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
              Save
            </button>
          </form>
        ))}
        {regions.length === 0 ? <p className="text-sm text-neutral-500">No regions configured yet.</p> : null}
      </div>

      {availableCodes.length > 0 ? (
        <form action={createRegionAction} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-900">Add region</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <p className="text-xs text-neutral-500">Code</p>
              <select name="code" className="rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-900 placeholder:text-neutral-400">
                {availableCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Name" name="name" placeholder="United States" />
            <Field label="Language (BCP-47)" name="language" placeholder="en-US" />
            <Field label="URL prefix" name="urlPrefix" placeholder="us" />
            <Field label="Currency" name="currency" placeholder="USD" />
            <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
              Add
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required
        className="rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-900 placeholder:text-neutral-400"
      />
    </div>
  );
}
