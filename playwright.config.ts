import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'https://mycvpassport.com';
const HEADLESS = process.env.HEADLESS !== 'false';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // Run sequentially — new user first, then frequent user
  retries: 1,
  workers: 1,

  reporter: [
    ['list'],                                          // Live terminal output
    ['html', { outputFolder: 'playwright-report', open: 'never' }], // Visual HTML report
    ['json', { outputFile: 'test-results/audit-report.json' }],     // JSON for automation
  ],

  use: {
    baseURL: BASE_URL,
    headless: HEADLESS,
    screenshot: 'on',           // Screenshot every step
    video: 'retain-on-failure', // Video only on failure
    trace: 'retain-on-failure', // Trace only on failure — open with: npx playwright show-trace
    actionTimeout: 15_000,
    navigationTimeout: 30_000,

    // Simulate real mobile user (FAB is mobile-first)
    ...devices['iPhone 13'],
  },

  projects: [
    {
      name: 'Mobile Chrome — New User',
      testMatch: 'new-user.spec.ts',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Mobile Chrome — Frequent User',
      testMatch: 'frequent-user.spec.ts',
      use: { ...devices['Pixel 7'] },
      dependencies: ['Mobile Chrome — New User'],
    },
    {
      name: 'Mobile Chrome — FAB Guided Flow',
      testMatch: 'fab-guided-flow.spec.ts',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Mobile Chrome — FAB Edge Cases',
      testMatch: 'fab-edge-cases.spec.ts',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Desktop — Full Journey',
      testMatch: '{new-user,frequent-user}.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  outputDir: 'test-results/',
});
