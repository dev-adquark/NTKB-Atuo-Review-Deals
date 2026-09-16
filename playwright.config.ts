import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // main-flow.spec.ts mutates shared database state (generates + publishes a
    // real page against the mock content engine's small phrase pool) — running
    // it twice back-to-back would make the second run's uniqueness check collide
    // with the first, which is a test-isolation issue rather than a product bug.
    // It only needs to run once; mobile-responsiveness has its own dedicated spec.
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "chromium-mobile", use: { ...devices["Pixel 7"] }, testIgnore: /main-flow\.spec\.ts/ },
  ],
  webServer: {
    // Runs against a real production build, matching what's actually deployed.
    command: `npm run build && PORT=${PORT} npm run start`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
