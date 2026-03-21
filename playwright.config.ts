// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 3,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  outputDir: 'test-results/',
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },

  use: {
    baseURL: 'http://localhost:8080',   // ← hardcoded, no env var
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
      use: {
        baseURL: 'http://localhost:8080',  // ← hardcoded here too
      },
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:8080',  // ← hardcoded here too
        storageState: 'tests/helpers/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        baseURL: 'http://localhost:8080',  // ← hardcoded here too
        storageState: 'tests/helpers/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        baseURL: 'http://localhost:8080',  // ← hardcoded here too
        storageState: 'tests/helpers/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});