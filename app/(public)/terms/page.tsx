import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-muted">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Legal</span>
      <h1 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground">Terms of Service</h1>
      <p className="mt-6 leading-relaxed">
        This is a placeholder terms of service page for the NTKB Auto Review Deals demo environment. Replace this
        page with your organization&rsquo;s real terms before going to production.
      </p>
    </div>
  );
}
