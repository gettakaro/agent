import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E test configuration for takaro-agent.
 *
 * Prerequisites:
 * - Docker services running: `docker compose up -d postgres redis`
 * - Or use reuseExistingServer if backend/frontend already running
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // Sequential for mock provider state consistency
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for deterministic mock responses
  reporter: "list",
  timeout: 60000, // 60s per test (allows for server startup)

  use: {
    baseURL: "http://localhost:3101",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: [
    {
      command: "npm run dev",
      url: "http://localhost:3100/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120000, // 2 minutes for backend startup
      env: {
        USE_MOCK_PROVIDER: "true",
      },
    },
    {
      command: "npm run dev",
      cwd: "./packages/web-agent",
      url: "http://localhost:3101",
      reuseExistingServer: !process.env.CI,
      timeout: 60000, // 1 minute for frontend startup
    },
  ],
});
