"use client";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** No-ops safely when analytics isn't configured/loaded — never throws, never blocks navigation. */
export function trackEvent(name: string, params: Record<string, string | number | undefined>): void {
  try {
    window.gtag?.("event", name, params);
  } catch {
    // Analytics must never break the page.
  }
}
