import Script from "next/script";

/**
 * Loads GA4 only when NEXT_PUBLIC_ANALYTICS_ID is configured. Renders nothing
 * otherwise, and never blocks page rendering (afterInteractive strategy).
 */
export function AnalyticsScripts() {
  const measurementId = process.env.NEXT_PUBLIC_ANALYTICS_ID;
  if (!measurementId) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}
