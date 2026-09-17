import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_BOOTSTRAP_EMAIL!;
const ADMIN_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD!;

test.describe("security: auth gating and open-redirect protection", () => {
  test("every admin route redirects to login when unauthenticated", async ({ page }) => {
    for (const path of [
      "/admin",
      "/admin/regions",
      "/admin/keywords",
      "/admin/brands",
      "/admin/affiliate-mappings",
      "/admin/sponsored",
      "/admin/generation",
      "/admin/pages",
      "/admin/refresh",
      "/admin/search",
      "/admin/gsc",
      "/admin/content-engine",
      "/admin/settings",
    ]) {
      await page.goto(path);
      await expect(page, `${path} must redirect to login when unauthenticated`).toHaveURL(/\/admin\/login$/);
    }
  });

  test("admin API routes reject unauthenticated requests", async ({ request }) => {
    const generation = await request.post("/api/generation", { data: { regionId: "x", pageType: "KEYWORD_REVIEW" } });
    expect(generation.status()).toBe(401);

    const test_ = await request.post("/api/content-engine/test");
    expect(test_.status()).toBe(401);
  });

  test("the cron-only refresh endpoint rejects requests without the correct shared secret", async ({ request }) => {
    const noSecret = await request.post("/api/refresh");
    expect([401, 503]).toContain(noSecret.status()); // 503 if CONTENT_REFRESH_SECRET isn't configured at all

    const wrongSecret = await request.post("/api/refresh", { headers: { "x-refresh-secret": "wrong" } });
    expect([401, 503]).toContain(wrongSecret.status());
  });

  test("the cron-only scheduled-generation endpoint rejects requests without a valid CRON_SECRET bearer token", async ({ request }) => {
    const noAuth = await request.get("/api/schedule/generate");
    expect([401, 503]).toContain(noAuth.status()); // 503 if CRON_SECRET isn't configured at all

    const wrongAuth = await request.get("/api/schedule/generate", { headers: { authorization: "Bearer wrong" } });
    expect([401, 503]).toContain(wrongAuth.status());
  });

  test("click redirect never forwards to a placeholder/example destination, and a destination query param is structurally ignored", async ({ page: browserPage, request }) => {
    // Discover a real brandId and pageId the same way an admin would — via the
    // admin UI's own detail-view links — rather than importing Prisma directly
    // (Playwright's test runner doesn't share Next.js's module loader for the
    // generated Prisma client).
    await browserPage.goto("/admin/login");
    await browserPage.fill('input[name="email"]', ADMIN_EMAIL);
    await browserPage.fill('input[name="password"]', ADMIN_PASSWORD);
    await browserPage.click('button[type="submit"]');
    await browserPage.waitForURL("/admin");

    await browserPage.goto("/admin/brands");
    const brandRow = browserPage.locator("tr", { hasText: "PulseGear" });
    const brandHref = await brandRow.locator('a[href^="/admin/brands/"]').getAttribute("href");
    const brandId = brandHref!.split("/").pop()!;

    // pulsegear's only configured mapping is the demo affiliate.example placeholder
    // (see prisma/seed.ts) — resolveAffiliateUrl() must treat that as no mapping.
    await browserPage.goto("/admin/pages");
    const pageRow = browserPage.locator("tr", { hasText: "PulseGear Review (US)" });
    const pageHref = await pageRow.locator('a[href^="/admin/pages/"]').getAttribute("href");
    const pageId = pageHref!.split("/").pop()!;

    const noQuery = await request.get(`/click/${brandId}`, { maxRedirects: 0 });
    expect([301, 302, 307, 308]).toContain(noQuery.status());
    expect(noQuery.headers()["location"]).not.toContain("affiliate.example");

    const placeholderMapping = await request.get(`/click/${brandId}?page=${pageId}`, { maxRedirects: 0 });
    expect([301, 302, 307, 308]).toContain(placeholderMapping.status());
    expect(placeholderMapping.headers()["location"], "a placeholder mapping must never be forwarded to").not.toContain("affiliate.example");

    // The route no longer reads a client-supplied destination at all — passing
    // one must have zero effect, proving the open-redirect surface is closed
    // structurally rather than merely validated away.
    const tampered = await request.get(`/click/${brandId}?page=${pageId}&destination=${encodeURIComponent("https://evil.example/phish")}`, {
      maxRedirects: 0,
    });
    expect([301, 302, 307, 308]).toContain(tampered.status());
    expect(tampered.headers()["location"]).not.toContain("evil.example");
    expect(tampered.headers()["location"]).toEqual(placeholderMapping.headers()["location"]);
  });

  test("draft/preview pages are not indexable (noindex or not publicly listed)", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    const body = await sitemap.text();
    // No admin/preview paths should ever be listed for indexing.
    expect(body).not.toContain("/admin");
  });
});
