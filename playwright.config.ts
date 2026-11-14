import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile-360",
      use: {
        viewport: { width: 360, height: 800 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "desktop-1440",
      use: {
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
