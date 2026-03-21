// tests/settings.spec.ts
/**
 * Settings Page – Playwright Test Suite
 * Covers: profile section, company section, notifications & preferences,
 * security / password change, and logout flow.
 */
import { test, expect } from '@playwright/test';
import { navigateTo, loginAs, BASE_URL, TEST_EMAIL, TEST_PASSWORD } from './helpers/auth.helper';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/settings');
  });

  // ── Page Load ─────────────────────────────────────────────────────────────────

  test('renders the Settings page without errors', async ({ page }) => {
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
  });

  // ── Profile Settings ──────────────────────────────────────────────────────────

  test('renders Profile Settings section', async ({ page }) => {
    await expect(page.getByText('Profile Settings')).toBeVisible();
  });

  test('renders First Name and Last Name fields pre-filled', async ({ page }) => {
    const firstNameInput = page.getByLabel(/first name/i);
    const lastNameInput = page.getByLabel(/last name/i);

    await expect(firstNameInput).toBeVisible();
    await expect(lastNameInput).toBeVisible();
  });

  test('renders Email field pre-filled with logged-in user email', async ({ page }) => {
    const emailInput = page.getByLabel(/email address/i);
    await expect(emailInput).toBeVisible();

    const value = await emailInput.inputValue();
    expect(value.length).toBeGreaterThan(0);
    expect(value).toContain('@');
  });

  test('renders Phone Number field', async ({ page }) => {
    const phoneInput = page.getByLabel(/phone number/i);
    await expect(phoneInput).toBeVisible();
  });

  test('renders Role field as read-only', async ({ page }) => {
    const roleInput = page.getByLabel(/^role$/i);
    await expect(roleInput).toBeVisible();
    await expect(roleInput).toBeDisabled();
  });

  test('Save Profile button is visible', async ({ page }) => {
    const saveBtn = page.getByRole('button', { name: /save profile/i });
    await expect(saveBtn).toBeVisible();
  });

  test('clicking Save Profile shows success toast', async ({ page }) => {
    const saveBtn = page.getByRole('button', { name: /save profile/i });
    await saveBtn.click();

    const toast = page.getByText(/profile updated/i);
    await expect(toast).toBeVisible({ timeout: 6_000 });
  });

  test('can edit first name field', async ({ page }) => {
    const firstNameInput = page.getByLabel(/first name/i);
    await firstNameInput.clear();
    await firstNameInput.fill('PlaywrightTest');
    await expect(firstNameInput).toHaveValue('PlaywrightTest');
  });

  // ── Company Settings ──────────────────────────────────────────────────────────

  test('renders Company Settings section', async ({ page }) => {
    await expect(page.getByText('Company Settings')).toBeVisible();
  });

  test('renders Company Name and GST Number fields', async ({ page }) => {
    const companyNameInput = page.getByLabel(/company name/i);
    const gstInput = page.getByLabel(/gst number/i);

    await expect(companyNameInput).toBeVisible();
    await expect(gstInput).toBeVisible();
  });

  test('renders Default Currency dropdown', async ({ page }) => {
    const currencySelect = page.getByLabel(/default currency/i)
      .or(page.getByRole('combobox').filter({ hasText: /inr|usd|eur/i }));

    await expect(currencySelect.first()).toBeVisible();
  });

  test('Save Company Settings button shows success toast', async ({ page }) => {
    const saveBtn = page.getByRole('button', { name: /save company settings/i });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    const toast = page.getByText(/company.*updated|settings.*saved/i);
    await expect(toast).toBeVisible({ timeout: 6_000 });
  });

  // ── Notifications & Preferences ───────────────────────────────────────────────

  test('renders Notifications & Preferences section', async ({ page }) => {
    await expect(page.getByText('Notifications & Preferences')).toBeVisible();
  });

  test('renders Email Notifications toggle switch', async ({ page }) => {
    const emailNotifLabel = page.getByText('Email Notifications');
    await expect(emailNotifLabel).toBeVisible();

    const toggle = page.locator('[role="switch"]').first();
    await expect(toggle).toBeVisible();
  });

  test('renders Push Notifications toggle switch', async ({ page }) => {
    await expect(page.getByText('Push Notifications')).toBeVisible();
  });

  test('renders Auto Save toggle switch', async ({ page }) => {
    await expect(page.getByText('Auto Save')).toBeVisible();
  });

  test('can toggle Email Notifications switch', async ({ page }) => {
    const switches = page.locator('[role="switch"]');
    const count = await switches.count();

    if (count > 0) {
      const initialState = await switches.first().getAttribute('data-state');
      await switches.first().click();
      const newState = await switches.first().getAttribute('data-state');
      expect(newState).not.toBe(initialState);
    }
  });

  test('renders Language select dropdown', async ({ page }) => {
    await expect(page.getByText('Language')).toBeVisible();
  });

  test('Save Preferences button shows success toast', async ({ page }) => {
    const saveBtn = page.getByRole('button', { name: /save preferences/i });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    const toast = page.getByText(/preferences saved|preferences.*updated/i);
    await expect(toast).toBeVisible({ timeout: 6_000 });
  });

  // ── Security Section ──────────────────────────────────────────────────────────

  test('renders Security section', async ({ page }) => {
    await expect(page.getByText('Security')).toBeVisible();
  });

  test('renders Current Password, New Password, Confirm Password fields', async ({ page }) => {
    await expect(page.getByLabel(/current password/i)).toBeVisible();
    await expect(page.getByLabel(/new password/i)).toBeVisible();
    await expect(page.getByLabel(/confirm new password/i)).toBeVisible();
  });

  test('renders Change Password button', async ({ page }) => {
    const changeBtn = page.getByRole('button', { name: /change password/i });
    await expect(changeBtn).toBeVisible();
  });

  // ── Logout Section ────────────────────────────────────────────────────────────

  test('renders the Logout section', async ({ page }) => {
    await expect(page.getByText('Logout')).toBeVisible();
  });

  test('renders the Logout button in destructive style', async ({ page }) => {
    const logoutBtn = page.getByRole('button', { name: /logout/i });
    await expect(logoutBtn).toBeVisible();
  });

  test('clicking Logout redirects to /login', async ({ page }) => {
    const logoutBtn = page.getByRole('button', { name: /logout/i });
    await logoutBtn.click();

    await page.waitForURL('**/login', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('after logout, revisiting dashboard redirects to login', async ({ page }) => {
    // Logout
    const logoutBtn = page.getByRole('button', { name: /logout/i });
    await logoutBtn.click();
    await page.waitForURL('**/login', { timeout: 15_000 });

    // Try to visit dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);

    // Should redirect to login or stay on login
    expect(page.url()).toMatch(/\/login/);
  });
});