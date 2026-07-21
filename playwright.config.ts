import { defineConfig, devices } from "@playwright/test";

// Minimal config: one chromium project, dev server on 3050.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "http://localhost:3050",
    headless: true,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Both processes: the Next app (3050) and the sync server (3051). Without sync
  // the canvas never leaves its loading state and blocks UI interactions.
  webServer: [
    {
      command: "npm run dev",
      url: "http://localhost:3050",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm run sync",
      url: "http://localhost:3051",
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
