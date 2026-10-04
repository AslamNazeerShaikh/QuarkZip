import { defineConfig, devices } from "@playwright/test";
// @ts-expect-error type error without @types/node package
import process from "node:process";

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:1423",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx vite --mode e2e --port 1423 --strictPort",
    url: "http://localhost:1423",
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "chromium-dark",
      use: { ...devices["Desktop Chrome"], colorScheme: "dark" },
    },
  ],
});
