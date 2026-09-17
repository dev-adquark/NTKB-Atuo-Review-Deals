import { test, expect } from "@playwright/test";

test.describe("site-wide link/route integrity", () => {
  test("robots.txt is valid and references the sitemap", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("Sitemap:");
    expect(body).toContain("Disallow: /admin");
  });

  let sitemapUrls: string[] = [];

  test("sitemap.xml is valid and contains only real, resolvable URLs", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const body = await response.text();
    const matches = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)];
    expect(matches.length).toBeGreaterThan(0);
    sitemapUrls = matches.map((m) => m[1]);

    for (const url of sitemapUrls) {
      expect(url, "sitemap URL must not be empty/undefined").toMatch(/^https?:\/\//);
      expect(url, "sitemap must never list an admin URL").not.toContain("/admin");
    }
  });

  test("every sitemap URL resolves with HTTP 200 and no console errors", async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(sitemapUrls.length === 0, "sitemap fetch must run first in this file");

    for (const url of sitemapUrls) {
      const path = new URL(url).pathname;
      const errors: string[] = [];
      const onConsole = (msg: import("@playwright/test").ConsoleMessage) => {
        if (msg.type() === "error") errors.push(msg.text());
      };
      page.on("console", onConsole);

      const response = await page.goto(path, { waitUntil: "load" });
      expect(response?.status(), `${path} should be 200`).toBe(200);
      expect(errors, `console errors on ${path}: ${errors.join("; ")}`).toHaveLength(0);

      page.off("console", onConsole);
    }
  });

  test("legal pages resolve", async ({ page }) => {
    for (const path of ["/privacy", "/terms", "/affiliate-disclosure"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
    }
  });

  test("an unknown path returns a real HTTP 404, not a soft 200", async ({ page }) => {
    const response = await page.goto("/this-path-does-not-exist-12345");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("Page not found")).toBeVisible();
  });

  test("an unknown region prefix returns 404", async ({ page }) => {
    const response = await page.goto("/zz");
    expect(response?.status()).toBe(404);
  });

  test("homepage region links all resolve to a real region hub", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/");
    const hrefs = await page.locator('a[href^="/us"], a[href^="/eu"], a[href^="/au"], a[href^="/in"]').evaluateAll((els) =>
      els.map((el) => el.getAttribute("href")),
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href, "no empty/placeholder href on the homepage").toBeTruthy();
      const response = await page.request.get(href!);
      expect(response.status(), `${href} should resolve`).toBe(200);
    }
  });

  test("no href=\"#\" placeholder links or empty hrefs anywhere on the homepage or a region hub", async ({ page }) => {
    for (const path of ["/", "/us"]) {
      await page.goto(path);
      const badHrefs = await page.locator("a").evaluateAll((els) =>
        els
          .map((el) => el.getAttribute("href"))
          .filter((href) => href === "#" || href === "" || href === null),
      );
      expect(badHrefs, `${path} has placeholder/empty links`).toHaveLength(0);
    }
  });

  test("every internal link on the homepage, a region hub, and the deals page resolves to a real page", async ({ page }) => {
    test.setTimeout(60_000);
    const seen = new Set<string>();
    for (const path of ["/", "/us", "/eu", "/us/deals"]) {
      await page.goto(path);
      const hrefs = await page.locator("a[href]").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
      hrefs.forEach((h) => h && seen.add(h));
    }
    for (const href of seen) {
      if (!href.startsWith("/") || href.startsWith("//")) continue; // external/protocol-relative
      const target = href.split("#")[0] || "/";
      const response = await page.request.get(target);
      expect(response.status(), `${href} should resolve, not 404/dead-link`).toBe(200);
    }
  });

  test("no page renders a duplicate header/footer, including 404 pages and article pages", async ({ page }) => {
    for (const path of [
      "/",
      "/us",
      "/this-path-does-not-exist-12345",
      "/us/this-slug-does-not-exist",
      "/zz",
      "/us/best-budget-smartwatches",
    ]) {
      await page.goto(path);
      // Scoped to the one site-wide nav chrome, not every <header> tag on the
      // page — an article page legitimately has its own semantic <header> for
      // its title block (components/content/generated-page-view.tsx), which
      // is a different, valid landmark, not a duplicated navbar.
      await expect(page.locator("header").filter({ hasText: "NTKB" }), `${path} must render exactly one site header`).toHaveCount(1);
      await expect(page.locator("footer"), `${path} must render exactly one footer`).toHaveCount(1);
    }
  });

  test("an article with an attached Pexels image always shows required photographer/Pexels attribution", async ({ page }) => {
    // Regression test: this attribution was stripped out by an external edit
    // twice in one session. Pexels' API license requires visible credit on
    // every image used — it must never silently disappear.
    await page.goto("/us/best-budget-smartwatches");
    await expect(page.locator("figure img")).toBeVisible();
    const attribution = page.getByText(/Photo:.*\/\s*Pexels/);
    await expect(attribution).toBeVisible();
    const href = await attribution.getAttribute("href");
    expect(href, "attribution must link to the real Pexels photo page").toMatch(/^https:\/\/www\.pexels\.com\//);
  });
});
