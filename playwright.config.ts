import { defineConfig, devices } from '@playwright/test';

/**
 * Duely Playwright configuration — two projects per locked decision 18:
 *   • dev    → Angular dev-server on port 4200
 *   • server → production build served by Express on port 8000
 *
 * See docs/2026_MIGRATION_TASKBOARD.md §5 #34 and docs/TESTING_GUIDE.md §8.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter: list for terminal output, html for artefacts (never auto-opens). */
  reporter: [['list'], ['html', { open: 'never' }]],
  /* Shared settings for all the projects below. */
  use: {
    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
  },
  /* Global timeout for each test (30 s). */
  timeout: 30_000,
  /* Timeout for expect() assertions (10 s). */
  expect: { timeout: 10_000 },

  /* Configure projects for the two server targets. Chromium only — the Docker
   * image installs just the Chromium headless shell (§8 of TESTING_GUIDE). */
  projects: [
    {
      name: 'dev',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4200',
      },
    },
    {
      name: 'server',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:8000',
      },
    },
  ],

  /* Two web servers: the Angular dev-server and the Express production server.
   * Both start before any test run; Playwright kills them on exit. */
  webServer: [
    {
      command: 'npm run serve',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
    },
    {
      command: 'npm run build:prod && npm run start:server',
      url: 'http://localhost:8000',
      reuseExistingServer: false,
      timeout: 300_000,
      stdout: 'pipe',
    },
  ],
});
