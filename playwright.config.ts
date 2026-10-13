import { defineConfig, devices } from "@playwright/test";

// End-to-end tests of the inventory workflows (decision D16). They drive a
// running frontend against a running API with a real database; see
// e2e/README.md for how to start both. Nothing here touches production.
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // The workflows build on each other inside one organisation, and the API
  // rate-limits sign-ins per address, so the suite runs one test at a time.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    viewport: { width: 1360, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1360, height: 900 } } }],
});
