import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/guard";
import { logoutAction } from "@/app/admin/actions";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/regions", label: "Regions" },
  { href: "/admin/keywords", label: "Keywords" },
  { href: "/admin/brands", label: "Brands" },
  { href: "/admin/affiliate-mappings", label: "Affiliate Mappings" },
  { href: "/admin/sponsored", label: "Sponsored" },
  { href: "/admin/generation", label: "Generation" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/refresh", label: "Content Freshness" },
  { href: "/admin/search", label: "Search" },
  { href: "/admin/gsc", label: "Google Search Console" },
  { href: "/admin/content-engine", label: "Content Engine" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminPage();

  return (
    <div className="admin-light-scope min-h-screen bg-neutral-50 md:flex">
      <aside className="border-b border-neutral-200 bg-white md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="p-4">
          <p className="text-sm font-semibold text-neutral-900">NTKB Admin</p>
          <p className="mt-0.5 truncate text-xs text-neutral-500">{session.email}</p>
        </div>
        <nav className="flex flex-wrap gap-1 px-2 pb-2 md:flex-col md:pb-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2.5 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction} className="border-t border-neutral-200 p-2">
          <button type="submit" className="w-full rounded-md px-2.5 py-1.5 text-left text-sm text-neutral-500 hover:bg-neutral-100">
            Sign out
          </button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
