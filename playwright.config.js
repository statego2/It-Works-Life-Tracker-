import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: {
    ...devices["iPhone 13"],
    browserName: "chromium",
    defaultBrowserType: "chromium",
    baseURL: "http://127.0.0.1:4173",
    serviceWorkers: "block",
    locale: "el-GR",
  },
  webServer: {
    command: "node scripts/serve.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
  },
});
