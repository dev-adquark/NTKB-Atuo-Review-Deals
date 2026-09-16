"use client";

import { trackEvent } from "@/lib/analytics/track";

/**
 * Outbound affiliate CTA. Actual click tracking/audit happens server-side in
 * /click/[brandId] regardless of analytics; this only adds an optional GA4 event
 * when analytics is configured, and never blocks or delays the navigation.
 */
export function AffiliateCtaLink({
  href,
  brandId,
  pageId,
  region,
  ctaLocation,
  className,
  children,
}: {
  href: string;
  brandId: string;
  pageId: string;
  region: string;
  ctaLocation: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => trackEvent("affiliate_cta_click", { brand_id: brandId, page_id: pageId, region, cta_location: ctaLocation })}
    >
      {children}
    </a>
  );
}
