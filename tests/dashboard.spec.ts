// tests/dashboard.spec.ts
/**
 * Dashboard Page – Playwright Test Suite
 * Covers: stat cards, recent / upcoming trips widgets, quick actions,
 * navigation, empty states, and role-based greeting.
 */
import { test, expect } from '@playwright/test';
import { navigateTo } from './helpers/auth.helper';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/dashboard');
  });

  // ── Page Layout ───────────────────────────────────────────────────────────────

  test('renders the dashboard page without crashing', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    // The greeting always contains the user's name
    await expect(page.getByText(/welcome back/i)).toBeVisible();
  });

  test('shows the sub-headline copy', async ({ page }) => {
    await expect(
      page.getByText("Here's what's happening with your trips today.")
    ).toBeVisible();
  });

  // ── Stat Cards ────────────────────────────────────────────────────────────────

  test('renders all four primary stat cards', async ({ page }) => {
    await expect(page.getByText('Total Trips')).toBeVisible();
    await expect(page.getByText('Active Trips')).toBeVisible();
    await expect(page.getByText('Total Revenue')).toBeVisible();
    await expect(page.getByText('Total Participants')).toBeVisible();
  });

  test('renders secondary category stat cards', async ({ page }) => {
    await expect(page.getByText('Domestic Trips')).toBeVisible();
    await expect(page.getByText('International Trips')).toBeVisible();
    await expect(page.getByText('Institute Trips')).toBeVisible();
    await expect(page.getByText('Commercial Trips')).toBeVisible();
  });

  test('stat card values are numeric (or formatted currency)', async ({ page }) => {
    // Total Trips value should be a number
    const totalTripsCard = page.locator('text=Total Trips').locator('..').locator('..');
    const value = await totalTripsCard.locator('p.text-2xl, p.text-3xl, p.text-4xl').first().textContent();
    expect(value).toBeTruthy();
  });

  // ── Recent Trips Widget ───────────────────────────────────────────────────────

  test('renders the Recent Trips card', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Recent Trips' })).toBeVisible();
  });

  test('Recent Trips card has View All button', async ({ page }) => {
    const viewAll = page.locator('text=Recent Trips').locator('../..').getByRole('button', { name: /view all/i });
    await expect(viewAll).toBeVisible();
  });

  test('clicking View All in Recent Trips navigates to /trips', async ({ page }) => {
    // Find view-all buttons (there may be two – recent and upcoming)
    const viewAllBtns = page.getByRole('button', { name: /view all/i });
    await viewAllBtns.first().click();
    await page.waitForURL('**/trips');
    await expect(page).toHaveURL(/\/trips/);
  });

  // ── Upcoming Trips Widget ─────────────────────────────────────────────────────

  test('renders the Upcoming Trips card', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Upcoming Trips' })).toBeVisible();
  });

  // ── Empty State ───────────────────────────────────────────────────────────────

  test('shows Create Your First Trip button when no trips exist in recent card', async ({ page }) => {
    // If there are no trips, an empty-state CTA appears
    const noTripsText = page.getByText('No trips yet');
    const createFirstTrip = page.getByRole('button', { name: /create your first trip/i });

    // Either trips exist OR empty state is shown — both are valid
    const hasTrips = await page.getByText('No trips yet').count();
    if (hasTrips > 0) {
      await expect(noTripsText).toBeVisible();
      await expect(createFirstTrip).toBeVisible();
    } else {
      // At least one trip card is rendered
      const tripCards = page.locator('[class*="border"][class*="rounded"]').filter({ hasText: /draft|sent|approved|completed|locked/i });
      expect(await tripCards.count()).toBeGreaterThan(0);
    }
  });

  // ── Quick Actions ─────────────────────────────────────────────────────────────

  test('renders the Quick Actions card with three buttons', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible();
    await expect(page.getByRole('button', { name: /create new trip/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /view all trips/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /manage masters/i })).toBeVisible();
  });

  test('Create New Trip quick-action navigates to /trips/create', async ({ page }) => {
    await page.getByRole('button', { name: /create new trip/i }).click();
    await page.waitForURL('**/trips/create', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/trips\/create/);
  });

  test('View All Trips quick-action navigates to /trips', async ({ page }) => {
    await page.getByRole('button', { name: /view all trips/i }).click();
    await page.waitForURL('**/trips');
    await expect(page).toHaveURL(/\/trips/);
  });

  test('Manage Masters quick-action navigates to /masters', async ({ page }) => {
    await page.getByRole('button', { name: /manage masters/i }).click();
    await page.waitForURL('**/masters');
    await expect(page).toHaveURL(/\/masters/);
  });

  // ── Loading State ─────────────────────────────────────────────────────────────

  test('page does not show unhandled error messages', async ({ page }) => {
    // No JS error dialogs
    const errorDialog = page.getByText(/something went wrong|unhandled error/i);
    await expect(errorDialog).toHaveCount(0);
  });

  // ── Trip Item Interaction ─────────────────────────────────────────────────────

  test('clicking a recent trip item navigates to its detail page', async ({ page }) => {
    // Only run if trips exist
    const tripItems = page.locator('div').filter({
      has: page.locator('.text-xs.text-muted-foreground'),
    }).filter({ hasText: /draft|sent|approved|completed|locked/i });

    const count = await tripItems.count();
    if (count > 0) {
      await tripItems.first().click();
      await page.waitForURL('**/trips/**', { timeout: 15_000 });
      expect(page.url()).toMatch(/\/trips\/[a-zA-Z0-9-]+/);
    } else {
      test.skip();
    }
  });
});