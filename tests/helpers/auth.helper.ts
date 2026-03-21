// tests/helpers/auth.helper.ts
/**
 * Shared helpers consumed by all spec files.
 * – loginAs()     : perform a fresh login (for tests that need it explicitly)
 * – navigateTo()  : go to a route after confirming auth
 *
 * BASE_URL is intentionally NOT hardcoded here — all navigation uses
 * relative paths (e.g. '/login') so Playwright resolves them against
 * the baseURL set in playwright.config.ts. This avoids port mismatches.
 */
import { Page, expect } from '@playwright/test';

export const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@gmail.com';
export const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

/**
 * Perform a full login via the Login page UI.
 * Returns when the dashboard is visible.
 */
export async function loginAs(
  page: Page,
  email = TEST_EMAIL,
  password = TEST_PASSWORD
): Promise<void> {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

  await page.getByLabel('Email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  await page.waitForURL('**/dashboard', { timeout: 30_000 });
}

/**
 * Navigate to a route; if redirected to login, authenticate first.
 */
export async function navigateTo(page: Page, route: string): Promise<void> {
  await page.goto(route);

  // If the app redirected to login (unauthenticated), log in first
  if (page.url().includes('/login')) {
    await loginAs(page);
    await page.goto(route);
  }

  await page.waitForLoadState('networkidle');
}

/**
 * Wait for a toast / sonner notification matching text.
 */
export async function expectToast(page: Page, text: string | RegExp): Promise<void> {
  // Sonner renders toasts in a [data-sonner-toaster] region
  const toast = page.locator('[data-sonner-toaster]').getByText(text);
  await expect(toast).toBeVisible({ timeout: 8_000 });
}

/**
 * Dismiss any open dialog with the "Cancel" or close button.
 */
export async function closeDialog(page: Page): Promise<void> {
  const cancelBtn = page.getByRole('button', { name: /cancel/i });
  if (await cancelBtn.isVisible()) {
    await cancelBtn.click();
  } else {
    await page.keyboard.press('Escape');
  }
}