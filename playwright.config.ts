import { defineConfig } from "@playwright/test";

export default defineConfig({
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
    },
  },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  retries: process.env.CI ? 1 : 0,
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    colorScheme: "light",
    locale: "en-US",
    screenshot: "only-on-failure",
    serviceWorkers: "block",
    timezoneId: "America/New_York",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    viewport: {
      width: 1280,
      height: 900,
    },
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: "http://127.0.0.1:4173",
  },
  workers: process.env.CI ? 1 : undefined,
});
