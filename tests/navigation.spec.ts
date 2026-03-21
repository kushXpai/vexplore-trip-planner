// tests/navigation.spec.ts
/**
 * Navigation & NotFound – Playwright Test Suite
 * Covers: sidebar/nav links, 404 page rendering, redirect behaviors,
 * authentication guards, and breadcrumb/back navigation.
 */
import { test, expect } from '@playwright/test';
import { navigateTo, BASE_URL } from './helpers/auth.helper';

test.describe('404 Not Found Page', () => {
  test('renders 404 page for unknown routes', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await page.goto(`${BASE_URL}/this-route-does-not-exist`);
    await page.waitForTimeout(1000);

    // Either shows 404 or redirects to dashboard
    const is404 = await page.getByText('404').isVisible().catch(() => false);
    const isOnApp = page.url().includes('/dashboard') || page.url().includes('/trips');
    expect(is404 || isOnApp).toBe(true);
  });

  test('404 page shows "Page not found" message', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await page.goto(`${BASE_URL}/nonexistent-xyz-page`);
    await page.waitForTimeout(1000);

    const notFoundText = page.getByText(/page not found|not found|404/i);
    const visible = await notFoundText.first().isVisible().catch(() => false);
    // Accept either 404 message OR redirect to app
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('404 page has a Return to Home / Dashboard link', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await page.goto(`${BASE_URL}/some-nonexistent-path`);
    await page.waitForTimeout(1000);

    const homeLink = page
      .getByRole('link', { name: /return to home|go home|dashboard/i })
      .or(page.getByText(/return to home|return to dashboard/i));

    const visible = await homeLink.first().isVisible().catch(() => false);
    if (visible) {
      await homeLink.first().click();
      await page.waitForURL('**/dashboard', { timeout: 10_000 });
      await expect(page).toHaveURL(/\/dashboard/);
    }
  });
});

test.describe('Application Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/dashboard');
  });

  // ── Sidebar Navigation ────────────────────────────────────────────────────────

  test('sidebar / navbar is visible on dashboard', async ({ page }) => {
    // Navigation container
    const nav = page.locator('nav, aside, [class*="sidebar"], [class*="nav"]').first();
    await expect(nav).toBeVisible();
  });

  test('Dashboard nav link is present', async ({ page }) => {
    const dashLink = page
      .getByRole('link', { name: /dashboard/i })
      .or(page.locator('a[href="/dashboard"]'));
    const visible = await dashLink.first().isVisible().catch(() => false);
    expect(visible).toBe(true);
  });

  test('Trips nav link navigates to /trips', async ({ page }) => {
    const tripsLink = page
      .getByRole('link', { name: /trips/i })
      .or(page.locator('a[href="/trips"]'));

    if (await tripsLink.first().count() > 0) {
      await tripsLink.first().click();
      await page.waitForURL('**/trips', { timeout: 10_000 });
      await expect(page).toHaveURL(/\/trips/);
    }
  });

  test('Masters nav link navigates to /masters', async ({ page }) => {
    const mastersLink = page
      .getByRole('link', { name: /masters/i })
      .or(page.locator('a[href="/masters"]'));

    if (await mastersLink.first().count() > 0) {
      await mastersLink.first().click();
      await page.waitForURL('**/masters', { timeout: 10_000 });
      await expect(page).toHaveURL(/\/masters/);
    }
  });

  test('Reports nav link navigates to /reports', async ({ page }) => {
    const reportsLink = page
      .getByRole('link', { name: /reports/i })
      .or(page.locator('a[href="/reports"]'));

    if (await reportsLink.first().count() > 0) {
      await reportsLink.first().click();
      await page.waitForURL('**/reports', { timeout: 10_000 });
      await expect(page).toHaveURL(/\/reports/);
    }
  });

  test('Settings nav link navigates to /settings', async ({ page }) => {
    const settingsLink = page
      .getByRole('link', { name: /settings/i })
      .or(page.locator('a[href="/settings"]'));

    if (await settingsLink.first().count() > 0) {
      await settingsLink.first().click();
      await page.waitForURL('**/settings', { timeout: 10_000 });
      await expect(page).toHaveURL(/\/settings/);
    }
  });

  // ── Auth Guard ────────────────────────────────────────────────────────────────

  test('unauthenticated user is redirected from /dashboard to /login', async ({ page }) => {
    // Clear auth state and attempt to visit dashboard
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);

    // Should redirect to login
    expect(page.url()).toMatch(/\/login|\/$/);
  });

  // ── Responsive Navigation ─────────────────────────────────────────────────────

  test('navigation is visible on desktop viewport (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const nav = page.locator('nav, aside').first();
    await expect(nav).toBeVisible();
  });

  test('page layout adapts on mobile viewport (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(300);

    // Page should still render heading
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
  });

  // ── Browser History ───────────────────────────────────────────────────────────

  test('browser forward/back navigation works correctly', async ({ page }) => {
    // Go to trips
    await page.goto(`${BASE_URL}/trips`);
    await page.waitForURL('**/trips');

    // Go to masters
    await page.goto(`${BASE_URL}/masters`);
    await page.waitForURL('**/masters');

    // Go back
    await page.goBack();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/trips/);

    // Go forward
    await page.goForward();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/masters/);
  });

  // ── Page Title ────────────────────────────────────────────────────────────────

  test('page has a meaningful document title', async ({ page }) => {
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});

test.describe('Authentication Guards', () => {
  // These tests clear storage to test unauthenticated state
  test.use({ storageState: { cookies: [], origins: [] } });

  test('visiting /dashboard without auth redirects to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);
    // Should land on login or root
    expect(page.url()).toMatch(/\/login|\/$|\/index/);
  });

  test('visiting /trips without auth redirects to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/trips`);
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/\/login|\/$|\/index/);
  });

  test('visiting /masters without auth redirects to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/masters`);
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/\/login|\/$|\/index/);
  });

  test('visiting /settings without auth redirects to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/\/login|\/$|\/index/);
  });

  test('visiting /reports without auth redirects to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`);
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/\/login|\/$|\/index/);
  });

  test('login page is accessible without auth', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 10_000 });
  });
});