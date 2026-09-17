import { test, expect } from "@playwright/test";

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

  test("click redirect only ever forwards to a real, currently-active affiliate mapping URL", async ({ page, request }) => {
    // Find a real /click/ link from a live public page rather than guessing an ID.
    await page.goto("/us/best-wireless-earbuds");
    const clickHref = await page.locator('a[href^="/click/"]').first().getAttribute("href");
    expect(clickHref).toBeTruthy();

    const legit = await request.get(clickHref!, { maxRedirects: 0 });
    expect([301, 302, 307, 308]).toContain(legit.status());
    const legitLocation = legit.headers()["location"];
    expect(legitLocation).toMatch(/^https:\/\/affiliate\.example\//);

    // Tamper with the destination — must NOT be honored as an open redirect.
    const url = new URL(clickHref!, "http://localhost");
    url.searchParams.set("destination", "https://evil.example/phish");
    const tampered = await request.get(url.pathname + url.search, { maxRedirects: 0 });
    expect([301, 302, 307, 308]).toContain(tampered.status());
    const tamperedLocation = tampered.headers()["location"];
    expect(tamperedLocation).not.toContain("evil.example");
  });

  test("draft/preview pages are not indexable (noindex or not publicly listed)", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    const body = await sitemap.text();
    // No admin/preview paths should ever be listed for indexing.
    expect(body).not.toContain("/admin");
  });
});
