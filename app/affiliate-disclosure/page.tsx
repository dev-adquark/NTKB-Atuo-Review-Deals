import type { Metadata } from "next";
import { AFFILIATE_DISCLOSURE_TEXT } from "@/lib/validation/disclosure";

export const metadata: Metadata = { title: "Affiliate Disclosure" };

export default function AffiliateDisclosurePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-neutral-700">
      <h1 className="text-2xl font-semibold text-neutral-900">Affiliate Disclosure</h1>
      <p className="mt-4">{AFFILIATE_DISCLOSURE_TEXT}</p>
      <p className="mt-4">
        Some pages on this site also feature sponsored brand placements. Sponsored content is always labeled as
        &ldquo;Sponsored&rdquo; and includes its own disclosure alongside the sponsor&rsquo;s information.
      </p>
      <p className="mt-4">
        Affiliate relationships never influence which brands we cover, and we do not fabricate prices, discounts, or
        rankings — pricing and availability can change, so always confirm current terms before purchasing.
      </p>
    </div>
  );
}
