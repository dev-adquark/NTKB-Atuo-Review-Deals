import { test, expect } from "@playwright/test";

test.describe("mobile-first responsiveness", () => {
  test.skip(({ isMobile }) => !isMobile, "this spec only needs to run on the mobile project");

  const pagesToCheck = [
    "/",
    "/us",
    "/us/best-wireless-earbuds",
    "/us/reviews/pulsegear",
    "/us/deals/best-laptop-deals",
    "/privacy",
    "/affiliate-disclosure",
  ];

  for (const path of pagesToCheck) {
    test(`${path} has no horizontal overflow on a mobile viewport`, async ({ page }) => {
      await page.goto(path, { waitUntil: "load" });
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth, `${path}: content wider than viewport (scrollWidth ${scrollWidth} > clientWidth ${clientWidth})`).toBeLessThanOrEqual(
        clientWidth + 1, // allow 1px rounding
      );
    });
  }

  test("admin login form is usable on a mobile viewport", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    const box = await page.locator('button[type="submit"]').boundingBox();
    expect(box?.width).toBeGreaterThan(0);
  });
});
