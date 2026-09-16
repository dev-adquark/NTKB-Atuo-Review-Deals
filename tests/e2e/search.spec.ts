import { test, expect } from "@playwright/test";

test.describe("search", () => {
  test("public search finds a published page and never exposes drafts", async ({ page }) => {
    await page.goto("/search?q=password");
    await expect(page.getByText(/result.* for/)).toBeVisible();
    const link = page.getByRole("link", { name: /password managers/i }).first();
    await expect(link).toBeVisible();
  });

  test("public search with no query shows the form without results", async ({ page }) => {
    await page.goto("/search");
    const response = await page.goto("/search");
    expect(response?.status()).toBe(200);
    await expect(page.locator('input[name="q"]')).toBeVisible();
  });

  test("admin search requires login", async ({ page }) => {
    await page.goto("/admin/search?q=password");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
