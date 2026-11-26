import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PRINT_PREVIEW_E2E_PORT ?? 3200);

export default defineConfig({
  testDir: "./e2e-preview",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 15_000,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_API_BASE_URL: "http://mock-api.local/api/v1",
      NEXT_PUBLIC_MOCK_MODE: "",
    },
  },
});
