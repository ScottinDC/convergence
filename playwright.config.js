// @ts-check
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"]],
  timeout: 60_000,
  expect: {
    timeout: 15_000
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    actionTimeout: 10_000,
    navigationTimeout: 30_000
  },
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
