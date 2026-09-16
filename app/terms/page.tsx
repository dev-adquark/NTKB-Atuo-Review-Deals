import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-neutral-700">
      <h1 className="text-2xl font-semibold text-neutral-900">Terms of Service</h1>
      <p className="mt-4">
        This is a placeholder terms of service page for the NTKB Auto Review Deals demo environment. Replace this
        page with your organization&rsquo;s real terms before going to production.
      </p>
    </div>
  );
}
