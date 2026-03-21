// tests/login.spec.ts
/**
 * Login Page – Playwright Test Suite
 * Covers: UI rendering, validation, successful login, failed login,
 * password visibility toggle, redirect if already authenticated.
 */
import { test, expect } from '@playwright/test';
import { TEST_EMAIL, TEST_PASSWORD } from './helpers/auth.helper';

// These tests deliberately bypass the saved session — they need the login page
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  // ── UI Rendering ─────────────────────────────────────────────────────────────

  test('renders the login page with all expected elements', async ({ page }) => {
    // FIX 1: getByText('V-Explore') matched 3 elements causing a strict-mode violation.
    // At the default 1280px viewport the left panel is visible (lg:flex) and the mobile
    // span is hidden (lg:hidden). Target the left-panel logo span directly via its
    // unique text-white class — it is always visible at desktop width.
    await expect(
      page.locator('span.text-xl.font-bold.text-white', { hasText: 'V-Explore' })
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByText('Sign in to your account to continue')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('renders left branding panel on large viewports', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByText('Manage your trips')).toBeVisible();
    await expect(page.getByText('500+')).toBeVisible();
    await expect(page.getByText('Trips managed')).toBeVisible();
  });

  test('hides left panel on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const leftPanel = page.locator('.hidden.lg\\:flex');
    await expect(leftPanel).toBeHidden();
  });

  // ── Password Visibility Toggle ────────────────────────────────────────────────

  test('toggles password visibility when eye icon is clicked', async ({ page }) => {
    // Use #password id to avoid strict mode conflict with toggle button
    const passwordInput = page.locator('#password');
    const toggleBtn = page.getByRole('button', { name: /toggle password visibility/i });

    // Default: masked
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click to reveal
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click to mask again
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  // ── Form Validation ───────────────────────────────────────────────────────────

  test('shows browser validation for empty email on submit', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click();
    const emailInput = page.getByLabel('Email');
    await expect(emailInput).toBeFocused();
  });

  test('shows browser validation for invalid email format', async ({ page }) => {
    await page.getByLabel('Email').fill('notanemail');
    await page.locator('#password').fill('somepassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    const emailInput = page.getByLabel('Email');
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });

  // ── Successful Login ──────────────────────────────────────────────────────────

  test('redirects to /dashboard on valid credentials', async ({ page }) => {
    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.locator('#password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Loading spinner visible during request
    await expect(page.getByText(/signing in/i)).toBeVisible();

    await page.waitForURL('**/dashboard', { timeout: 30_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('shows success toast after successful login', async ({ page }) => {
    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.locator('#password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 30_000 });

    const toast = page.getByText(/welcome back/i).first();
    await expect(toast).toBeVisible({ timeout: 8_000 });
  });

  // ── Failed Login ──────────────────────────────────────────────────────────────

  test('shows error toast on invalid credentials', async ({ page }) => {
    await page.getByLabel('Email').fill('wrong@example.com');
    await page.locator('#password').fill('WrongPassword123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    // FIX 2: The regex matched 3 nodes — the toast title <div>, the toast description
    // <div>, and the aria-live announcement <span> that concatenates both.
    // Scope to the visible title div only to get a unique match.
    const errorMsg = page.locator('div.text-sm.font-semibold', { hasText: 'Login failed' });
    await expect(errorMsg).toBeVisible({ timeout: 15_000 });

    await expect(page).toHaveURL(/\/login/);
  });

  test('submit button is disabled while request is in-flight', async ({ page }) => {
    // FIX 3: With real credentials the request completes so fast that the button
    // transitions from "Sign In" → "Signing in..." (disabled) → gone before the
    // locator can assert. Throttle the network so the in-flight state is observable.
    await page.route('**/api/auth/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_000)); // hold for 2 s
      await route.continue();
    });

    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.locator('#password').fill(TEST_PASSWORD);

    // Re-query after click so the locator resolves against the updated DOM
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('button', { name: /signing in/i })).toBeDisabled({ timeout: 3_000 });
  });

  // ── Keyboard Navigation ───────────────────────────────────────────────────────

  test('can submit form using Enter key', async ({ page }) => {
    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.locator('#password').fill(TEST_PASSWORD);
    await page.keyboard.press('Enter');

    await page.waitForURL('**/dashboard', { timeout: 30_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('tab navigation moves focus from email to password', async ({ page }) => {
    await page.getByLabel('Email').click();
    await page.keyboard.press('Tab');
    await expect(page.locator('#password')).toBeFocused();
  });
});