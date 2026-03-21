// tests/global.setup.ts
import { test as setup, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_FILE = path.join(__dirname, 'helpers/.auth/user.json');

setup('authenticate and save session', async ({ page }) => {
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const email = process.env.TEST_USER_EMAIL ?? 'test@gmail.com';
  const password = process.env.TEST_USER_PASSWORD ?? 'TestPassword123!';

  await page.goto('/login');

  await expect(
    page.getByRole('heading', { name: 'Welcome back' })
  ).toBeVisible({ timeout: 15_000 });

  await page.getByLabel('Email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for dashboard URL — this is sufficient to confirm login success
  await page.waitForURL('**/dashboard', { timeout: 30_000 });

  // Use exact dashboard heading instead of the ambiguous "welcome back" text
  await expect(
    page.getByRole('heading', { level: 1 }).filter({ hasText: /welcome back/i })
  ).toBeVisible({ timeout: 15_000 });

  await page.context().storageState({ path: AUTH_FILE });
  console.log('✅ Session saved →', AUTH_FILE);
});