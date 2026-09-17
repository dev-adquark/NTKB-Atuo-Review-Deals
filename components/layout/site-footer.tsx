import Link from "next/link";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Explore",
    links: [
      { label: "Mattress Reviews", href: "/us" },
      { label: "Top Picks & Deals", href: "/us/deals" },
      { label: "Search", href: "/search" },
    ],
  },
  {
    heading: "Guides",
    links: [
      { label: "How We Review", href: "/us" },
      { label: "Firmness & Comfort", href: "/us" },
      { label: "Cooling & Materials", href: "/us" },
    ],
  },
  {
    heading: "Regions",
    links: [
      { label: "United States", href: "/us" },
      { label: "Europe", href: "/eu" },
      { label: "Australia", href: "/au" },
      { label: "India", href: "/in" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Affiliate Disclosure", href: "/affiliate-disclosure" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border-default bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{col.heading}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-foreground/80 transition-colors hover:text-primary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-border-default pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-base font-medium text-foreground">
            NTKB<span className="text-primary">.</span> Auto Review Deals
          </p>
          <p className="max-w-xl text-xs leading-relaxed text-muted">
            Some links on this site are affiliate links. We may earn a commission if you purchase through them, at no
            extra cost to you — this never influences which brands we cover or what a review says.{" "}
            <Link href="/affiliate-disclosure" className="underline underline-offset-2">
              Full disclosure
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
