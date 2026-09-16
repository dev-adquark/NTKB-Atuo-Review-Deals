import Link from "next/link";
import { prisma } from "@/lib/db";
import { createBrandAction } from "./actions";

export default async function AdminBrandsPage() {
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Brands</h1>
        <p className="text-sm text-neutral-500">Manage brands, their per-region rankings, and affiliate mappings.</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs text-neutral-500">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Slug</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => (
              <tr key={brand.id} className="border-b border-neutral-100 last:border-0">
                <td className="p-3 font-medium text-neutral-900">{brand.name}</td>
                <td className="p-3 text-neutral-500">{brand.slug}</td>
                <td className="p-3 text-right">
                  <Link href={`/admin/brands/${brand.id}`} className="text-sm text-neutral-700 underline">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
            {brands.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-3 text-neutral-500">
                  No brands yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <form action={createBrandAction} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Add brand</h2>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Name" name="name" placeholder="Example Brand" />
          <Field label="Slug (optional)" name="slug" placeholder="example-brand" />
          <Field label="Logo URL (optional)" name="logoUrl" placeholder="https://…" />
          <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            Add
          </button>
        </div>
        <Field label="Description (optional)" name="description" placeholder="Short description" full />
      </form>
    </div>
  );
}

function Field({ label, name, placeholder, full }: { label: string; name: string; placeholder?: string; full?: boolean }) {
  return (
    <div className={full ? "w-full" : undefined}>
      <p className="text-xs text-neutral-500">{label}</p>
      <input
        name={name}
        placeholder={placeholder}
        className={`rounded-md border border-neutral-300 px-2 py-2 text-sm ${full ? "w-full" : ""}`}
      />
    </div>
  );
}
