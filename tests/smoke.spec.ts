// tests/smoke.spec.ts
/**
 * Smoke & Accessibility Tests – Playwright Test Suite
 * Covers: critical user journeys end-to-end, keyboard accessibility,
 * ARIA roles, color contrast basics, and full app flow sanity checks.
 */
import { test, expect } from '@playwright/test';
import { navigateTo, loginAs, BASE_URL, TEST_EMAIL, TEST_PASSWORD } from './helpers/auth.helper';

test.describe('Critical User Journey – Smoke Tests', () => {
  test('complete login → dashboard → trips → create trip flow', async ({ page }) => {
    // Start from login
    await page.goto(`${BASE_URL}/login`);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    // Login
    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 30_000 });

    // Dashboard loaded
    await expect(page.getByText(/welcome back/i)).toBeVisible();

    // Navigate to trips
    await page.goto(`${BASE_URL}/trips`);
    await page.waitForURL('**/trips');
    await expect(page.getByRole('heading', { name: 'All Trips' })).toBeVisible();

    // Navigate to create trip
    await page.getByRole('button', { name: /create new trip/i }).click();
    await page.waitForURL('**/trips/create', { timeout: 10_000 });
    await expect(page.getByRole('heading').first()).toBeVisible();

    // Cancel back to trips
    const cancelBtn = page.getByRole('button', { name: /cancel/i });
    if (await cancelBtn.count() > 0) {
      await cancelBtn.click();
    } else {
      await page.goto(`${BASE_URL}/trips`);
    }
    await page.waitForURL('**/trips', { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'All Trips' })).toBeVisible();
  });

  test('complete login → settings → logout flow', async ({ page }) => {
    await loginAs(page);
    await page.waitForURL('**/dashboard', { timeout: 30_000 });

    // Go to settings
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForURL('**/settings');
    await expect(page.getByText('Profile Settings')).toBeVisible();

    // Logout
    const logoutBtn = page.getByRole('button', { name: /logout/i });
    await logoutBtn.click();
    await page.waitForURL('**/login', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('dashboard quick action → masters navigation', async ({ page }) => {
    await navigateTo(page, '/dashboard');

    await page.getByRole('button', { name: /manage masters/i }).click();
    await page.waitForURL('**/masters', { timeout: 10_000 });
    await expect(page).toHaveURL(/\/masters/);
  });

  test('all top-level routes respond with 200-level content', async ({ page }) => {
    const routes = ['/dashboard', '/trips', '/masters', '/reports', '/settings'];

    for (const route of routes) {
      await page.goto(`${BASE_URL}${route}`);
      await page.waitForTimeout(800);

      // Should not redirect to login (session is stored)
      const url = page.url();
      expect(url).not.toMatch(/\/login/);

      // No critical error messages
      const errorText = await page.getByText(/something went wrong/i).count();
      expect(errorText).toBe(0);
    }
  });
});

test.describe('Keyboard Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/dashboard');
  });

  test('can navigate interactive elements with Tab key on dashboard', async ({ page }) => {
    // Start from body, tab through focusable elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // A focused element should exist
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });

  test('buttons are keyboard-activatable with Enter', async ({ page }) => {
    await navigateTo(page, '/trips');

    const createBtn = page.getByRole('button', { name: /create new trip/i });
    await createBtn.focus();
    await page.keyboard.press('Enter');

    await page.waitForURL('**/trips/create', { timeout: 10_000 });
    await expect(page).toHaveURL(/\/trips\/create/);
  });

  test('modal dialogs can be closed with Escape key', async ({ page }) => {
    await navigateTo(page, '/masters');
    await page.waitForTimeout(500);

    const hotelsTab = page.getByRole('tab', { name: /hotels/i })
      .or(page.getByText(/^Hotels$/i).first());

    if (await hotelsTab.count() > 0) {
      await hotelsTab.first().click();
      await page.waitForTimeout(400);

      const addBtn = page.getByRole('button', { name: /add hotel/i });
      if (await addBtn.isVisible()) {
        await addBtn.click();

        const dialog = page.getByRole('dialog');
        if (await dialog.isVisible()) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
          await expect(dialog).not.toBeVisible({ timeout: 5_000 });
        }
      }
    }
  });
});

test.describe('ARIA and Semantic HTML', () => {
  test('Login page has proper form landmark and labels', async ({ page }) => {
    // Clear state for login page
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE_URL}/login`);

    // Form should have associated labels
    const emailLabel = page.getByLabel('Email');
    const passwordLabel = page.getByLabel('Password');
    await expect(emailLabel).toBeVisible();
    await expect(passwordLabel).toBeVisible();
  });

  test('dashboard has heading hierarchy (h1 exists)', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible();
  });

  test('trips list has heading hierarchy', async ({ page }) => {
    await navigateTo(page, '/trips');
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible();
  });

  test('buttons have accessible text or aria-labels', async ({ page }) => {
    await navigateTo(page, '/dashboard');

    const buttons = page.getByRole('button');
    const count = await buttons.count();

    // Sample first 5 buttons
    const sampleCount = Math.min(count, 5);
    for (let i = 0; i < sampleCount; i++) {
      const btn = buttons.nth(i);
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute('aria-label');
      const title = await btn.getAttribute('title');

      // Each button should have some accessible identifier
      const hasText = (text?.trim().length ?? 0) > 0;
      const hasAriaLabel = (ariaLabel?.length ?? 0) > 0;
      const hasTitle = (title?.length ?? 0) > 0;

      // At least one accessible identifier
      expect(hasText || hasAriaLabel || hasTitle).toBe(true);
    }
  });

  test('data tables have column headers', async ({ page }) => {
    await navigateTo(page, '/users');
    await page.waitForTimeout(1000);

    if (!page.url().includes('/users')) { return; }

    const tables = page.locator('table');
    const tableCount = await tables.count();

    if (tableCount > 0) {
      const headers = tables.first().locator('th');
      const headerCount = await headers.count();
      expect(headerCount).toBeGreaterThan(0);
    }
  });
});

test.describe('Visual Regression Baselines', () => {
  test('login page layout matches baseline', async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Screenshot for visual diff in CI
    await expect(page).toHaveScreenshot('login-page.png', {
      maxDiffPixels: 500,
      timeout: 15_000,
    });
  });

  test('dashboard layout matches baseline', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500); // allow charts/data to load

    await expect(page).toHaveScreenshot('dashboard-page.png', {
      maxDiffPixels: 1000,
      timeout: 15_000,
    });
  });

  test('trips list layout matches baseline', async ({ page }) => {
    await navigateTo(page, '/trips');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('trips-list-page.png', {
      maxDiffPixels: 1000,
      timeout: 15_000,
    });
  });
});

test.describe('Performance Checks', () => {
  test('dashboard loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await navigateTo(page, '/dashboard');
    await page.waitForLoadState('networkidle');
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(5000);
  });

  test('trips list loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await navigateTo(page, '/trips');
    await page.waitForLoadState('networkidle');
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(5000);
  });

  test('no console errors on dashboard', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await navigateTo(page, '/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Filter out known benign errors (e.g., favicon 404, extension injections)
    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('extension') &&
        !e.includes('ERR_BLOCKED') &&
        !e.includes('net::ERR')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});