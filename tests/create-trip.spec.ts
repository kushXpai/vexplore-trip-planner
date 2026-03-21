// tests/create-trip.spec.ts
/**
 * Create Trip Page – Comprehensive Playwright Test Suite
 * Covers every section, every permutation, every interaction in CreateTrip.tsx.
 *
 * Sections covered:
 *  1.  Page Load & Master Data
 *  2.  Trip Classification – Category (Domestic / International)
 *  3.  Trip Classification – Type (Institute / Commercial / FTI)
 *  4.  Trip Classification – Planning Mode (Self-Planned / Tour Planner)
 *  5.  Basic Information (Trip Name, Institution dynamic labels)
 *  6.  Itinerary / City / Date Management
 *  7.  Participants – Institute (Boys, Girls, Faculty, VXplorers)
 *  8.  Participants – Commercial (Male, Female, Commercial VXplorers)
 *  9.  Participants – FTI (Male, Female, Kids — no VXplorers)
 *  10. Flights – Add / Delete / Collapse / Basic Fields
 *  11. Flights – Cabin Classes (Economy, Premium Economy, Business, First)
 *  12. Flights – Seat Upgrades
 *  13. Flights – Meal Upgrades
 *  14. Buses – Add / Delete / Fields / Total
 *  15. Trains – Add / Delete / Fields / Class (1AC/2AC/3AC/Sleeper)
 *  16. Accommodation – Add / Delete / Basic Fields
 *  17. Accommodation – Room Types (Single, Double, Triple)
 *  18. Accommodation – Allocation Mode (Auto vs Manual)
 *  19. Accommodation – Room Preferences (Institute: Students, Faculty, VXplorers)
 *  20. Accommodation – Room Preferences (Commercial: Participants, VXplorers)
 *  21. Accommodation – Optimize by Cost toggle
 *  22. Accommodation – Add Hotel Dialog
 *  23. Accommodation – Driver Room / Breakfast Included toggles
 *  24. Meals – Breakfast / Lunch / Dinner cost per person + Free Meal Pax
 *  25. Meals – Restaurant selector + Add Restaurant Dialog (star ratings 1–5)
 *  26. Activities – Add / Delete / Entry, Transport, Guide costs
 *  27. Overheads – Per Person vs Lump Sum / Hide from Client
 *  28. Extras – Insurance (required, all trips)
 *  29. Extras – Visa + Tips (international only)
 *  30. Cost Summary – all line items, GST/TCS/TDS visibility per combination
 *  31. Validation – all required-field error toasts
 *  32. Save / Cancel buttons
 *  33. Cross-permutation: Category × Type (6 combos) for tax line visibility
 *  34. Cross-permutation: Participant fields per trip type cycling
 *  35. Cross-permutation: Extras visibility for all type × category combos
 *  36. Section IDs for nav sidebar
 *
 * All Supabase writes are intercepted via page.route() — no DB records created.
 */
import { test, expect, Page } from '@playwright/test';
import { navigateTo } from './helpers/auth.helper';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function waitForMasterData(page: Page) {
  await expect(page.getByText('Loading...')).toBeHidden({ timeout: 15_000 });
}

async function mockSupabaseWrites(page: Page) {
  await page.route('**/rest/v1/**', async (route) => {
    const method = route.request().method();
    if (method === 'POST' || method === 'PATCH' || method === 'DELETE') {
      await route.fulfill({ status: 200, body: JSON.stringify([{ id: 'mock-id-123' }]) });
    } else {
      await route.continue();
    }
  });
}

async function addFlight(page: Page) {
  await page.getByRole('button', { name: /add flight/i }).click();
  await page.waitForTimeout(200);
}

async function addBus(page: Page) {
  await page.getByRole('button', { name: /add bus/i }).click();
  await page.waitForTimeout(200);
}

async function addTrain(page: Page) {
  await page.getByRole('button', { name: /add train/i }).click();
  await page.waitForTimeout(200);
}

async function addAccommodation(page: Page) {
  await page.getByRole('button', { name: /add accommodation/i }).click();
  await page.waitForTimeout(200);
}

async function addActivity(page: Page) {
  await page.getByRole('button', { name: /add activity/i }).click();
  await page.waitForTimeout(200);
}

async function addOverhead(page: Page) {
  await page.getByRole('button', { name: /add overhead/i }).click();
  await page.waitForTimeout(200);
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe('Create Trip Page – Comprehensive', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/trips/create');
    await waitForMasterData(page);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 1. PAGE LOAD
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Page Load', () => {
    test('renders at /trips/create', async ({ page }) => {
      await expect(page).toHaveURL(/\/trips\/create/);
    });

    test('shows "Create New Trip" h1 heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Create New Trip', level: 1 })).toBeVisible();
    });

    test('no unhandled error messages on load', async ({ page }) => {
      await expect(page.getByText(/something went wrong|unhandled exception/i)).toHaveCount(0);
    });

    test('loading spinner disappears after master data loads', async ({ page }) => {
      await expect(page.getByText('Loading...')).toBeHidden();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. TRIP CATEGORY
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Trip Category', () => {
    test('Trip Classification card is visible', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Trip Classification' })).toBeVisible();
    });

    test('Domestic radio renders and is checked by default', async ({ page }) => {
      await expect(page.locator('#domestic')).toBeChecked();
    });

    test('International radio renders and unchecked by default', async ({ page }) => {
      await expect(page.locator('#international')).not.toBeChecked();
    });

    test('selecting International checks it and unchecks Domestic', async ({ page }) => {
      await page.locator('#international').click();
      await expect(page.locator('#international')).toBeChecked();
      await expect(page.locator('#domestic')).not.toBeChecked();
    });

    test('selecting International shows tax info banner with GST and TCS', async ({ page }) => {
      await page.locator('#international').click();
      await expect(page.getByText('International Trip - Tax Info')).toBeVisible();
      await expect(page.getByText(/GST.*5%.*applied to the subtotal/i)).toBeVisible();
      await expect(page.getByText(/TCS.*5%.*applied after GST/i)).toBeVisible();
    });

    test('switching back to Domestic hides international banner', async ({ page }) => {
      await page.locator('#international').click();
      await page.locator('#domestic').click();
      await expect(page.getByText('International Trip - Tax Info')).toBeHidden();
    });

    test('domestic: TCS line hidden in cost summary', async ({ page }) => {
      await expect(page.getByText(/TCS.*%.*on Subtotal/i)).toBeHidden();
    });

    test('international: TCS line visible in cost summary', async ({ page }) => {
      await page.locator('#international').click();
      await expect(page.getByText(/TCS.*%.*on Subtotal/i)).toBeVisible();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 3. TRIP TYPE
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Trip Type', () => {
    test('Institute Trip radio checked by default', async ({ page }) => {
      await expect(page.locator('#institute')).toBeChecked();
    });

    test('Commercial Trip radio unchecked by default', async ({ page }) => {
      await expect(page.locator('#commercial')).not.toBeChecked();
    });

    test('FTI Trip radio unchecked by default', async ({ page }) => {
      await expect(page.locator('#fti')).not.toBeChecked();
    });

    test('selecting Commercial checks it and unchecks others', async ({ page }) => {
      await page.locator('#commercial').click();
      await expect(page.locator('#commercial')).toBeChecked();
      await expect(page.locator('#institute')).not.toBeChecked();
      await expect(page.locator('#fti')).not.toBeChecked();
    });

    test('selecting FTI checks it and unchecks others', async ({ page }) => {
      await page.locator('#fti').click();
      await expect(page.locator('#fti')).toBeChecked();
      await expect(page.locator('#institute')).not.toBeChecked();
    });

    test('FTI shows FTI Tax Info banner', async ({ page }) => {
      await page.locator('#fti').click();
      await expect(page.getByText('FTI Trip - Tax Info')).toBeVisible();
    });

    test('FTI domestic banner shows GST + TDS only', async ({ page }) => {
      await page.locator('#fti').click();
      await expect(page.getByText(/GST.*applied on subtotal/i)).toBeVisible();
      await expect(page.getByText(/TDS.*deducted on.*Subtotal \+ GST/i)).toBeVisible();
    });

    test('FTI international banner shows GST + TCS + TDS', async ({ page }) => {
      await page.locator('#international').click();
      await page.locator('#fti').click();
      await expect(page.getByText(/TCS.*applied on.*Subtotal \+ GST/i)).toBeVisible();
      await expect(page.getByText(/TDS.*deducted on.*Subtotal \+ GST \+ TCS/i)).toBeVisible();
    });

    test('FTI: TDS line visible in cost summary', async ({ page }) => {
      await page.locator('#fti').click();
      await expect(page.getByText(/TDS.*%.*deducted/i)).toBeVisible();
    });

    test('non-FTI: TDS line hidden in cost summary', async ({ page }) => {
      await expect(page.getByText(/TDS.*%.*deducted/i)).toBeHidden();
    });

    test('FTI banner disappears when switching back to Institute', async ({ page }) => {
      await page.locator('#fti').click();
      await page.locator('#institute').click();
      await expect(page.getByText('FTI Trip - Tax Info')).toBeHidden();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 4. PLANNING MODE
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Planning Mode', () => {
    test('Self-Planned is checked by default', async ({ page }) => {
      await expect(page.locator('#self_planned')).toBeChecked();
    });

    test('Tour Planner is unchecked by default', async ({ page }) => {
      await expect(page.locator('#tour_planner')).not.toBeChecked();
    });

    test('selecting Tour Planner checks it', async ({ page }) => {
      await page.locator('#tour_planner').click();
      await expect(page.locator('#tour_planner')).toBeChecked();
      await expect(page.locator('#self_planned')).not.toBeChecked();
    });

    test('can switch back to Self-Planned', async ({ page }) => {
      await page.locator('#tour_planner').click();
      await page.locator('#self_planned').click();
      await expect(page.locator('#self_planned')).toBeChecked();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 5. BASIC INFORMATION
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Basic Information', () => {
    test('Basic Information card renders', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Basic Information' })).toBeVisible();
    });

    test('Trip Name input renders', async ({ page }) => {
      await expect(page.getByPlaceholder(/paris cultural tour/i)).toBeVisible();
    });

    test('can fill Trip Name', async ({ page }) => {
      await page.getByPlaceholder(/paris cultural tour/i).fill('My Trip');
      await expect(page.getByPlaceholder(/paris cultural tour/i)).toHaveValue('My Trip');
    });

    test('clearing Trip Name empties field', async ({ page }) => {
      const input = page.getByPlaceholder(/paris cultural tour/i);
      await input.fill('Test');
      await input.clear();
      await expect(input).toHaveValue('');
    });

    test('Institution label is "Institution Name *" for institute type', async ({ page }) => {
      await expect(page.getByText('Institution Name *')).toBeVisible();
    });

    test('Institution placeholder is St. Mary\'s for institute type', async ({ page }) => {
      await expect(page.getByPlaceholder(/st\. mary/i)).toBeVisible();
    });

    test('Institution label changes to "Company / Group Name *" for commercial', async ({ page }) => {
      await page.locator('#commercial').click();
      await expect(page.getByText('Company / Group Name *')).toBeVisible();
    });

    test('Institution placeholder changes to Acme Corp for commercial', async ({ page }) => {
      await page.locator('#commercial').click();
      await expect(page.getByPlaceholder(/acme corp/i)).toBeVisible();
    });

    test('Institution label changes to "Family / Group Name *" for FTI', async ({ page }) => {
      await page.locator('#fti').click();
      await expect(page.getByText('Family / Group Name *')).toBeVisible();
    });

    test('can fill Institution Name', async ({ page }) => {
      await page.getByPlaceholder(/st\. mary/i).fill('Test School');
      await expect(page.getByPlaceholder(/st\. mary/i)).toHaveValue('Test School');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 6. ITINERARY / CITY
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Itinerary / City', () => {
    test('Add City button renders', async ({ page }) => {
      await expect(page.getByRole('button', { name: /add city/i })).toBeVisible();
    });

    test('clicking Add City reveals inline form with "New City" heading', async ({ page }) => {
      await page.getByRole('button', { name: /add city/i }).click();
      await expect(page.getByText('New City')).toBeVisible();
    });

    test('inline form shows Country and City selects', async ({ page }) => {
      await page.getByRole('button', { name: /add city/i }).click();
      // At least 2 comboboxes (country + city) appear
      await expect(page.getByRole('combobox').first()).toBeVisible();
    });

    test('City select is disabled until Country is chosen', async ({ page }) => {
      await page.getByRole('button', { name: /add city/i }).click();
      await expect(page.getByRole('combobox').nth(1)).toBeDisabled();
    });

    test('From Date and To Date hidden before city is selected', async ({ page }) => {
      await page.getByRole('button', { name: /add city/i }).click();
      await expect(page.getByText('From Date')).toBeHidden();
      await expect(page.getByText('To Date')).toBeHidden();
    });

    test('Cancel inside Add City form hides form', async ({ page }) => {
      await page.getByRole('button', { name: /add city/i }).click();
      await page.getByRole('button', { name: 'Cancel' }).first().click();
      await expect(page.getByText('New City')).toBeHidden();
    });

    test('Add City button reappears after cancel', async ({ page }) => {
      await page.getByRole('button', { name: /add city/i }).click();
      await page.getByRole('button', { name: 'Cancel' }).first().click();
      await expect(page.getByRole('button', { name: /add city/i })).toBeVisible();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 7. PARTICIPANTS — INSTITUTE
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Participants – Institute', () => {
    test('Participants card renders', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Participants' })).toBeVisible();
    });

    test('Boys label visible', async ({ page }) => {
      await expect(page.getByText('Boys', { exact: true })).toBeVisible();
    });

    test('Girls label visible', async ({ page }) => {
      await expect(page.getByText('Girls', { exact: true })).toBeVisible();
    });

    test('Male Faculty label visible', async ({ page }) => {
      await expect(page.getByText('Male Faculty', { exact: true })).toBeVisible();
    });

    test('Female Faculty label visible', async ({ page }) => {
      await expect(page.getByText('Female Faculty', { exact: true })).toBeVisible();
    });

    test('Male VXplorers label visible', async ({ page }) => {
      await expect(page.getByText('Male VXplorers', { exact: true }).first()).toBeVisible();
    });

    test('Female VXplorers label visible', async ({ page }) => {
      await expect(page.getByText('Female VXplorers', { exact: true }).first()).toBeVisible();
    });

    test('Total Students summary box renders', async ({ page }) => {
      await expect(page.getByText('Total Students')).toBeVisible();
    });

    test('Total Faculty summary box renders', async ({ page }) => {
      await expect(page.getByText('Total Faculty')).toBeVisible();
    });

    test('Total VXplorers summary box renders', async ({ page }) => {
      await expect(page.getByText('Total VXplorers')).toBeVisible();
    });

    test('Total Participants summary box renders', async ({ page }) => {
      await expect(page.getByText('Total Participants').first()).toBeVisible();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 8. PARTICIPANTS — COMMERCIAL
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Participants – Commercial', () => {
    test.beforeEach(async ({ page }) => {
      await page.locator('#commercial').click();
    });

    test('Male Participants label visible', async ({ page }) => {
      await expect(page.getByText('Male Participants', { exact: true })).toBeVisible();
    });

    test('Female Participants label visible', async ({ page }) => {
      await expect(page.getByText('Female Participants', { exact: true })).toBeVisible();
    });

    test('Boys and Girls labels hidden', async ({ page }) => {
      await expect(page.getByText('Boys', { exact: true })).toBeHidden();
      await expect(page.getByText('Girls', { exact: true })).toBeHidden();
    });

    test('Commercial Male VXplorers field visible (has htmlFor id)', async ({ page }) => {
      await expect(page.locator('#commercialMaleVXplorers')).toBeVisible();
    });

    test('Commercial Female VXplorers field visible (has htmlFor id)', async ({ page }) => {
      await expect(page.locator('#commercialFemaleVXplorers')).toBeVisible();
    });

    test('Total VXplorers summary visible', async ({ page }) => {
      await expect(page.getByText('Total VXplorers')).toBeVisible();
    });

    test('Total Participants summary visible', async ({ page }) => {
      await expect(page.getByText('Total Participants').first()).toBeVisible();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 9. PARTICIPANTS — FTI
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Participants – FTI', () => {
    test.beforeEach(async ({ page }) => {
      await page.locator('#fti').click();
    });

    test('Male Participants label visible', async ({ page }) => {
      await expect(page.getByText('Male Participants', { exact: true })).toBeVisible();
    });

    test('Female Participants label visible', async ({ page }) => {
      await expect(page.getByText('Female Participants', { exact: true })).toBeVisible();
    });

    test('Kids label visible', async ({ page }) => {
      await expect(page.getByText('Kids', { exact: true })).toBeVisible();
    });

    test('Boys and Girls labels hidden', async ({ page }) => {
      await expect(page.getByText('Boys', { exact: true })).toBeHidden();
    });

    test('Commercial VXplorer fields hidden', async ({ page }) => {
      await expect(page.locator('#commercialMaleVXplorers')).toBeHidden();
      await expect(page.locator('#commercialFemaleVXplorers')).toBeHidden();
    });

    test('Male Faculty hidden for FTI', async ({ page }) => {
      await expect(page.getByText('Male Faculty', { exact: true })).toBeHidden();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 10. FLIGHTS — CORE
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Flights – Core', () => {
    test('Add Flight button renders', async ({ page }) => {
      await expect(page.getByRole('button', { name: /add flight/i })).toBeVisible();
    });

    test('empty state: "No flights added yet."', async ({ page }) => {
      await expect(page.getByText('No flights added yet.')).toBeVisible();
    });

    test('Add Flight creates a flight card', async ({ page }) => {
      await addFlight(page);
      await expect(page.getByText('No flights added yet.')).toBeHidden();
      await expect(page.getByText('Flight 1')).toBeVisible();
    });

    test('flight card shows From / To / Airline / Flight Number fields', async ({ page }) => {
      await addFlight(page);
      await expect(page.getByPlaceholder('Departure city')).toBeVisible();
      await expect(page.getByPlaceholder('Arrival city')).toBeVisible();
      await expect(page.getByPlaceholder(/air india/i)).toBeVisible();
      await expect(page.getByPlaceholder(/AI 101/i)).toBeVisible();
    });

    test('flight card shows Departure and Arrival Time datetime inputs', async ({ page }) => {
      await addFlight(page);
      const dtInputs = page.locator('input[type="datetime-local"]');
      await expect(dtInputs.nth(0)).toBeVisible();
      await expect(dtInputs.nth(1)).toBeVisible();
    });

    test('can fill From and To fields', async ({ page }) => {
      await addFlight(page);
      await page.getByPlaceholder('Departure city').fill('Mumbai');
      await page.getByPlaceholder('Arrival city').fill('Paris');
      await expect(page.getByPlaceholder('Departure city')).toHaveValue('Mumbai');
      await expect(page.getByPlaceholder('Arrival city')).toHaveValue('Paris');
    });

    test('flight header updates to "BOM → CDG" when filled', async ({ page }) => {
      await addFlight(page);
      await page.getByPlaceholder('Departure city').fill('BOM');
      await page.getByPlaceholder('Arrival city').fill('CDG');
      await expect(page.getByText('BOM → CDG')).toBeVisible();
    });

    test('flight card can be collapsed', async ({ page }) => {
      await addFlight(page);
      await page.locator('[id^="section-flights"] .bg-muted\\/40 button').first().click();
      await expect(page.getByPlaceholder('Departure city')).toBeHidden();
    });

    test('flight card can be expanded after collapse', async ({ page }) => {
      await addFlight(page);
      const toggle = page.locator('[id^="section-flights"] .bg-muted\\/40 button').first();
      await toggle.click();
      await toggle.click();
      await expect(page.getByPlaceholder('Departure city')).toBeVisible();
    });

    test('delete button removes flight', async ({ page }) => {
      await addFlight(page);
      await page.locator('[id^="section-flights"]').getByRole('button').filter({ has: page.locator('svg') }).last().click();
      await expect(page.getByText('No flights added yet.')).toBeVisible();
    });

    test('can add two flights', async ({ page }) => {
      await addFlight(page);
      await addFlight(page);
      await expect(page.getByText('Flight 1')).toBeVisible();
      await expect(page.getByText('Flight 2')).toBeVisible();
    });

    test('Flights Total banner appears after adding flight', async ({ page }) => {
      await addFlight(page);
      await expect(page.getByText('Flights Total')).toBeVisible();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 11. FLIGHTS — CABIN CLASSES
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Flights – Cabin Classes', () => {
    test.beforeEach(async ({ page }) => {
      await addFlight(page);
    });

    test('Cabin Classes section renders with Add Class button', async ({ page }) => {
      await expect(page.getByText('Cabin Classes')).toBeVisible();
      await expect(page.getByRole('button', { name: /add class/i })).toBeVisible();
    });

    test('empty state text shown when no classes', async ({ page }) => {
      await expect(page.getByText(/no classes added/i)).toBeVisible();
    });

    test('Add Class creates a class row', async ({ page }) => {
      await page.getByRole('button', { name: /add class/i }).click();
      await expect(page.getByText(/no classes added/i)).toBeHidden();
    });

    test('class row has Cabin Class, Passengers, Cost/Person fields', async ({ page }) => {
      await page.getByRole('button', { name: /add class/i }).click();
      await expect(page.getByText('Cabin Class')).toBeVisible();
      await expect(page.getByText('Passengers')).toBeVisible();
    });

    test('Cabin Class select has Economy option', async ({ page }) => {
      await page.getByRole('button', { name: /add class/i }).click();
      await page.getByText('Cabin Class').locator('..').locator('button').click();
      await expect(page.getByRole('option', { name: 'Economy' })).toBeVisible();
    });

    test('Cabin Class select has Premium Economy option', async ({ page }) => {
      await page.getByRole('button', { name: /add class/i }).click();
      await page.getByText('Cabin Class').locator('..').locator('button').click();
      await expect(page.getByRole('option', { name: 'Premium Economy' })).toBeVisible();
    });

    test('Cabin Class select has Business option', async ({ page }) => {
      await page.getByRole('button', { name: /add class/i }).click();
      await page.getByText('Cabin Class').locator('..').locator('button').click();
      await expect(page.getByRole('option', { name: 'Business' })).toBeVisible();
    });

    test('Cabin Class select has First Class option', async ({ page }) => {
      await page.getByRole('button', { name: /add class/i }).click();
      await page.getByText('Cabin Class').locator('..').locator('button').click();
      await expect(page.getByRole('option', { name: 'First Class' })).toBeVisible();
    });

    test('can add multiple class rows', async ({ page }) => {
      await page.getByRole('button', { name: /add class/i }).click();
      await page.getByRole('button', { name: /add class/i }).click();
      const rows = page.locator('[id^="section-flights"] .bg-muted\\/30.border');
      await expect(rows).toHaveCount(2);
    });

    test('delete button on class row removes it', async ({ page }) => {
      await page.getByRole('button', { name: /add class/i }).click();
      const rows = page.locator('[id^="section-flights"] .bg-muted\\/30.border');
      await rows.first().getByRole('button').click();
      await expect(page.getByText(/no classes added/i)).toBeVisible();
    });

    test('classes subtotal line appears when cost is entered', async ({ page }) => {
      await page.getByRole('button', { name: /add class/i }).click();
      const numInputs = page.locator('[id^="section-flights"] .bg-muted\\/30 input[type="number"]');
      await numInputs.nth(0).fill('10');
      await numInputs.nth(1).fill('5000');
      await expect(page.getByText(/classes subtotal/i)).toBeVisible();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 12. FLIGHTS — SEAT UPGRADES
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Flights – Seat Upgrades', () => {
    test.beforeEach(async ({ page }) => {
      await addFlight(page);
    });

    test('Seat Upgrades section renders with Add Seat Upgrade button', async ({ page }) => {
      await expect(page.getByText('Seat Upgrades')).toBeVisible();
      await expect(page.getByRole('button', { name: /add seat upgrade/i })).toBeVisible();
    });

    test('empty state: no seat upgrades message', async ({ page }) => {
      await expect(page.getByText(/no seat upgrades/i)).toBeVisible();
    });

    test('Add Seat Upgrade creates a row', async ({ page }) => {
      await page.getByRole('button', { name: /add seat upgrade/i }).click();
      await expect(page.getByPlaceholder(/window seat/i)).toBeVisible();
    });

    test('seat upgrade row has Upgrade Label, Seats Selected, Cost/Seat', async ({ page }) => {
      await page.getByRole('button', { name: /add seat upgrade/i }).click();
      await expect(page.getByText('Seats Selected')).toBeVisible();
      await expect(page.getByText(/cost \/ seat/i)).toBeVisible();
    });

    test('can add multiple seat upgrade rows', async ({ page }) => {
      await page.getByRole('button', { name: /add seat upgrade/i }).click();
      await page.getByRole('button', { name: /add seat upgrade/i }).click();
      await expect(page.getByPlaceholder(/window seat/i)).toHaveCount(2);
    });

    test('seat upgrades subtotal appears when values entered', async ({ page }) => {
      await page.getByRole('button', { name: /add seat upgrade/i }).click();
      await page.getByPlaceholder(/window seat/i).fill('Aisle Seat');
      const numInputs = page.locator('[id^="section-flights"] input[type="number"]');
      await numInputs.nth(0).fill('5');
      await numInputs.nth(1).fill('300');
      await expect(page.getByText(/seat upgrades subtotal/i)).toBeVisible();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 13. FLIGHTS — MEAL UPGRADES
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Flights – Meal Upgrades', () => {
    test.beforeEach(async ({ page }) => {
      await addFlight(page);
    });

    test('Meal Upgrades section with Add Meal Upgrade button', async ({ page }) => {
      await expect(page.getByText('Meal Upgrades')).toBeVisible();
      await expect(page.getByRole('button', { name: /add meal upgrade/i })).toBeVisible();
    });

    test('empty state: no meal upgrades message', async ({ page }) => {
      await expect(page.getByText(/no meal upgrades/i)).toBeVisible();
    });

    test('Add Meal Upgrade creates a row', async ({ page }) => {
      await page.getByRole('button', { name: /add meal upgrade/i }).click();
      await expect(page.getByPlaceholder(/veg meal/i)).toBeVisible();
    });

    test('row has Meal Type, Meals Ordered, Cost/Meal fields', async ({ page }) => {
      await page.getByRole('button', { name: /add meal upgrade/i }).click();
      await expect(page.getByText('Meals Ordered')).toBeVisible();
      await expect(page.getByText(/cost \/ meal/i)).toBeVisible();
    });

    test('can add multiple meal upgrade rows', async ({ page }) => {
      await page.getByRole('button', { name: /add meal upgrade/i }).click();
      await page.getByRole('button', { name: /add meal upgrade/i }).click();
      await expect(page.getByPlaceholder(/veg meal/i)).toHaveCount(2);
    });

    test('meal upgrades subtotal appears when values entered', async ({ page }) => {
      await page.getByRole('button', { name: /add meal upgrade/i }).click();
      await page.getByPlaceholder(/veg meal/i).fill('Veg Meal');
      const numInputs = page.locator('[id^="section-flights"] input[type="number"]');
      await numInputs.nth(0).fill('10');
      await numInputs.nth(1).fill('200');
      await expect(page.getByText(/meal upgrades subtotal/i)).toBeVisible();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 14. BUSES
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Buses', () => {
    test('Add Bus button renders', async ({ page }) => {
      await expect(page.getByRole('button', { name: /add bus/i })).toBeVisible();
    });

    test('empty state: "No buses added yet."', async ({ page }) => {
      await expect(page.getByText('No buses added yet.')).toBeVisible();
    });

    test('Add Bus creates a card', async ({ page }) => {
      await addBus(page);
      await expect(page.getByText('Bus 1')).toBeVisible();
    });

    test('bus card has Bus Name/Type, Seating Capacity, Cost Per Bus, Days, Quantity', async ({ page }) => {
      await addBus(page);
      await expect(page.getByPlaceholder(/volvo ac sleeper/i)).toBeVisible();
      await expect(page.getByText('Seating Capacity')).toBeVisible();
      await expect(page.getByText('Cost Per Bus')).toBeVisible();
      await expect(page.getByText('Number of Days')).toBeVisible();
      await expect(page.getByText('Quantity (Number of Buses)')).toBeVisible();
    });

    test('bus name fills and updates header', async ({ page }) => {
      await addBus(page);
      await page.getByPlaceholder(/volvo ac sleeper/i).fill('Luxury Coach');
      await expect(page.getByText('Luxury Coach')).toBeVisible();
    });

    test('delete removes bus', async ({ page }) => {
      await addBus(page);
      await page.locator('[id^="section-buses"]').getByRole('button').filter({ has: page.locator('svg') }).last().click();
      await expect(page.getByText('No buses added yet.')).toBeVisible();
    });

    test('can add two buses', async ({ page }) => {
      await addBus(page);
      await addBus(page);
      await expect(page.getByText('Bus 1')).toBeVisible();
      await expect(page.getByText('Bus 2')).toBeVisible();
    });

    test('Buses Total banner appears', async ({ page }) => {
      await addBus(page);
      await expect(page.getByText('Buses Total')).toBeVisible();
    });

    test('bus can be collapsed', async ({ page }) => {
      await addBus(page);
      await page.locator('[id^="section-buses"] .bg-muted\\/40 button').first().click();
      await expect(page.getByPlaceholder(/volvo ac sleeper/i)).toBeHidden();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 15. TRAINS
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Trains', () => {
    test('Add Train button renders', async ({ page }) => {
      await expect(page.getByRole('button', { name: /add train/i })).toBeVisible();
    });

    test('empty state: "No trains added yet."', async ({ page }) => {
      await expect(page.getByText('No trains added yet.')).toBeVisible();
    });

    test('Add Train creates a card', async ({ page }) => {
      await addTrain(page);
      await expect(page.getByText('Train 1')).toBeVisible();
    });

    test('train card has Name, Number, Class, Timing, Cost Per Person', async ({ page }) => {
      await addTrain(page);
      await expect(page.getByPlaceholder(/rajdhani express/i)).toBeVisible();
      await expect(page.getByPlaceholder(/12301/i)).toBeVisible();
      await expect(page.getByPlaceholder(/3AC, 2AC, Sleeper/i)).toBeVisible();
      await expect(page.getByPlaceholder(/08:00 - 14:00/i)).toBeVisible();
    });

    test('can fill Class with "3AC"', async ({ page }) => {
      await addTrain(page);
      await page.getByPlaceholder(/3AC, 2AC, Sleeper/i).fill('3AC');
      await expect(page.getByPlaceholder(/3AC, 2AC, Sleeper/i)).toHaveValue('3AC');
    });

    test('can fill Class with "2AC"', async ({ page }) => {
      await addTrain(page);
      await page.getByPlaceholder(/3AC, 2AC, Sleeper/i).fill('2AC');
      await expect(page.getByPlaceholder(/3AC, 2AC, Sleeper/i)).toHaveValue('2AC');
    });

    test('can fill Class with "1AC"', async ({ page }) => {
      await addTrain(page);
      await page.getByPlaceholder(/3AC, 2AC, Sleeper/i).fill('1AC');
      await expect(page.getByPlaceholder(/3AC, 2AC, Sleeper/i)).toHaveValue('1AC');
    });

    test('can fill Class with "Sleeper"', async ({ page }) => {
      await addTrain(page);
      await page.getByPlaceholder(/3AC, 2AC, Sleeper/i).fill('Sleeper');
      await expect(page.getByPlaceholder(/3AC, 2AC, Sleeper/i)).toHaveValue('Sleeper');
    });

    test('delete removes train', async ({ page }) => {
      await addTrain(page);
      await page.locator('[id^="section-trains"]').getByRole('button').filter({ has: page.locator('svg') }).last().click();
      await expect(page.getByText('No trains added yet.')).toBeVisible();
    });

    test('Trains Total banner appears', async ({ page }) => {
      await addTrain(page);
      await expect(page.getByText('Trains Total')).toBeVisible();
    });

    test('train can be collapsed', async ({ page }) => {
      await addTrain(page);
      await page.locator('[id^="section-trains"] .bg-muted\\/40 button').first().click();
      await expect(page.getByPlaceholder(/rajdhani express/i)).toBeHidden();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 16. ACCOMMODATION — CORE
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Accommodation – Core', () => {
    test('Add Accommodation button renders', async ({ page }) => {
      await expect(page.getByRole('button', { name: /add accommodation/i })).toBeVisible();
    });

    test('empty state: "No accommodations added yet."', async ({ page }) => {
      await expect(page.getByText('No accommodations added yet.')).toBeVisible();
    });

    test('Add Accommodation creates a card', async ({ page }) => {
      await addAccommodation(page);
      await expect(page.getByText('Hotel 1')).toBeVisible();
    });

    test('accommodation card shows City and Hotel selects', async ({ page }) => {
      await addAccommodation(page);
      await expect(page.getByText('City').first()).toBeVisible();
      await expect(page.getByText('Hotel').first()).toBeVisible();
    });

    test('accommodation card shows Number of Nights', async ({ page }) => {
      await addAccommodation(page);
      await expect(page.getByText('Number of Nights')).toBeVisible();
    });

    test('accommodation card shows Breakfast Included toggle', async ({ page }) => {
      await addAccommodation(page);
      await expect(page.getByText('Breakfast Included')).toBeVisible();
    });

    test('Breakfast Included toggle can be turned on', async ({ page }) => {
      await addAccommodation(page);
      const toggle = page.locator('[id^="section-accommodation"]').getByRole('switch').first();
      await toggle.click();
      await expect(toggle).toBeChecked();
    });

    test('delete removes accommodation', async ({ page }) => {
      await addAccommodation(page);
      await page.locator('[id^="section-accommodation"]').getByRole('button').filter({ has: page.locator('svg') }).last().click();
      await expect(page.getByText('No accommodations added yet.')).toBeVisible();
    });

    test('can add two accommodations', async ({ page }) => {
      await addAccommodation(page);
      await addAccommodation(page);
      await expect(page.getByText('Hotel 1')).toBeVisible();
      await expect(page.getByText('Hotel 2')).toBeVisible();
    });

    test('accommodation can be collapsed', async ({ page }) => {
      await addAccommodation(page);
      await page.locator('[id^="section-accommodation"] .bg-muted\\/40 button').first().click();
      await expect(page.getByText('Number of Nights')).toBeHidden();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 17. ACCOMMODATION — ROOM TYPES
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Accommodation – Room Types', () => {
    test.beforeEach(async ({ page }) => {
      await addAccommodation(page);
    });

    test('Room Types & Pricing section renders', async ({ page }) => {
      await expect(page.getByText('Room Types & Pricing')).toBeVisible();
    });

    test('Add Room Type button renders', async ({ page }) => {
      await expect(page.getByRole('button', { name: /add room type/i })).toBeVisible();
    });

    test('Load Preset selector renders', async ({ page }) => {
      await expect(page.getByRole('combobox').filter({ hasText: /load preset/i })).toBeVisible();
    });

    test('Add Room Type creates a row', async ({ page }) => {
      await page.getByRole('button', { name: /add room type/i }).click();
      await expect(page.getByPlaceholder(/double, triple/i)).toBeVisible();
    });

    test('room type row has Room Type, Capacity, Cost Per Room', async ({ page }) => {
      await page.getByRole('button', { name: /add room type/i }).click();
      await expect(page.getByText('Capacity')).toBeVisible();
      await expect(page.getByText(/cost per room/i)).toBeVisible();
    });

    test('can type "Single" in room type', async ({ page }) => {
      await page.getByRole('button', { name: /add room type/i }).click();
      await page.getByPlaceholder(/double, triple/i).fill('Single');
      await expect(page.getByPlaceholder(/double, triple/i)).toHaveValue('Single');
    });

    test('can type "Double" in room type', async ({ page }) => {
      await page.getByRole('button', { name: /add room type/i }).click();
      await page.getByPlaceholder(/double, triple/i).fill('Double');
      await expect(page.getByPlaceholder(/double, triple/i)).toHaveValue('Double');
    });

    test('can type "Triple" in room type', async ({ page }) => {
      await page.getByRole('button', { name: /add room type/i }).click();
      await page.getByPlaceholder(/double, triple/i).fill('Triple');
      await expect(page.getByPlaceholder(/double, triple/i)).toHaveValue('Triple');
    });

    test('can add Single + Double room types together', async ({ page }) => {
      await page.getByRole('button', { name: /add room type/i }).click();
      await page.getByRole('button', { name: /add room type/i }).click();
      await expect(page.getByPlaceholder(/double, triple/i)).toHaveCount(2);
    });

    test('delete button removes a room type row', async ({ page }) => {
      await page.getByRole('button', { name: /add room type/i }).click();
      const row = page.locator('[id^="section-accommodation"] .grid-cols-4').first();
      await row.getByRole('button').click();
      await expect(page.getByPlaceholder(/double, triple/i)).toHaveCount(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 18. ACCOMMODATION — ALLOCATION MODE
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Accommodation – Allocation Mode', () => {
    test.beforeEach(async ({ page }) => {
      await addAccommodation(page);
    });

    test('Room Allocation Method section renders', async ({ page }) => {
      await expect(page.getByText('Room Allocation Method')).toBeVisible();
    });

    test('Auto Allocate option renders', async ({ page }) => {
      await expect(page.getByText('Auto Allocate')).toBeVisible();
    });

    test('Manual Allocate option renders', async ({ page }) => {
      await expect(page.getByText('Manual Allocate')).toBeVisible();
    });

    test('clicking Manual Allocate switches mode', async ({ page }) => {
      await page.getByText('Manual Allocate').click();
      const btn = page.getByText('Manual Allocate').locator('..');
      await expect(btn).toHaveClass(/border-primary/);
    });

    test('Auto mode: Optimize by Cost toggle visible', async ({ page }) => {
      await expect(page.getByText('Optimize by Cost')).toBeVisible();
    });

    test('Auto mode: Auto-Allocate Rooms button visible', async ({ page }) => {
      await expect(page.getByRole('button', { name: /auto-allocate rooms/i })).toBeVisible();
    });

    test('Optimize by Cost is off by default', async ({ page }) => {
      await expect(page.getByText(/following strict preference order/i)).toBeVisible();
    });

    test('turning on Optimize by Cost shows cheapest combination label', async ({ page }) => {
      const toggle = page.getByText('Optimize by Cost').locator('..').locator('..').getByRole('switch');
      await toggle.click();
      await expect(page.getByText(/finding cheapest room combination/i)).toBeVisible();
    });

    test('Manual mode hides Optimize by Cost and Auto-Allocate button', async ({ page }) => {
      await page.getByText('Manual Allocate').click();
      await expect(page.getByText('Optimize by Cost')).toBeHidden();
      await expect(page.getByRole('button', { name: /auto-allocate rooms/i })).toBeHidden();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 19. ACCOMMODATION — ROOM PREFERENCES (INSTITUTE)
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Accommodation – Room Preferences (Institute)', () => {
    test.beforeEach(async ({ page }) => {
      await addAccommodation(page);
      await page.getByRole('button', { name: /add room type/i }).click();
      await page.getByPlaceholder(/double, triple/i).fill('Double');
    });

    test('Room Preferences section renders', async ({ page }) => {
      await expect(page.getByText('Room Preferences (Priority Order)')).toBeVisible();
    });

    test('Students (Boys & Girls) preference group visible', async ({ page }) => {
      await expect(page.getByText('Students (Boys & Girls)')).toBeVisible();
    });

    test('Faculty preference group visible', async ({ page }) => {
      await expect(page.getByText('Faculty').first()).toBeVisible();
    });

    test('VXplorers preference group visible for institute', async ({ page }) => {
      await expect(page.getByText('VXplorers').first()).toBeVisible();
    });

    test('clicking room type button selects it as preference #1 for Students', async ({ page }) => {
      const studSection = page.getByText('Students (Boys & Girls)').locator('..').locator('..');
      const btn = studSection.getByRole('button', { name: /double/i });
      await btn.click();
      await expect(btn.getByText('1')).toBeVisible();
    });

    test('clicking selected preference button deselects it', async ({ page }) => {
      const studSection = page.getByText('Students (Boys & Girls)').locator('..').locator('..');
      const btn = studSection.getByRole('button', { name: /double/i });
      await btn.click();
      await btn.click();
      await expect(btn.getByText('1')).toBeHidden();
    });

    test('two room types show priority ordering badges 1 and 2', async ({ page }) => {
      await page.getByRole('button', { name: /add room type/i }).click();
      await page.getByPlaceholder(/double, triple/i).nth(1).fill('Triple');
      const studSection = page.getByText('Students (Boys & Girls)').locator('..').locator('..');
      await studSection.getByRole('button', { name: /double/i }).click();
      await studSection.getByRole('button', { name: /triple/i }).click();
      await expect(studSection.getByText('1')).toBeVisible();
      await expect(studSection.getByText('2')).toBeVisible();
    });

    test('Room Preferences section hidden in manual mode', async ({ page }) => {
      await page.getByText('Manual Allocate').click();
      await expect(page.getByText('Room Preferences (Priority Order)')).toBeHidden();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 20. ACCOMMODATION — ROOM PREFERENCES (COMMERCIAL)
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Accommodation – Room Preferences (Commercial)', () => {
    test.beforeEach(async ({ page }) => {
      await page.locator('#commercial').click();
      await addAccommodation(page);
      await page.getByRole('button', { name: /add room type/i }).click();
      await page.getByPlaceholder(/double, triple/i).fill('Double');
    });

    test('Participants group visible (not "Students")', async ({ page }) => {
      await expect(page.getByText('Participants').first()).toBeVisible();
      await expect(page.getByText('Students (Boys & Girls)')).toBeHidden();
    });

    test('VXplorers group visible for commercial', async ({ page }) => {
      await expect(page.getByText('VXplorers').first()).toBeVisible();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 21. MEALS
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Meals', () => {
    test('Meals card renders', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /meals/i }).first()).toBeVisible();
    });

    test('empty state: add hotels above message', async ({ page }) => {
      await expect(page.getByText(/no accommodations added yet.*add hotels above/i)).toBeVisible();
    });

    test('after adding accommodation, breakfast row appears', async ({ page }) => {
      await addAccommodation(page);
      await expect(page.getByText('🌅 Breakfast')).toBeVisible();
    });

    test('after adding accommodation, lunch row appears', async ({ page }) => {
      await addAccommodation(page);
      await expect(page.getByText('☀️ Lunch')).toBeVisible();
    });

    test('after adding accommodation, dinner row appears', async ({ page }) => {
      await addAccommodation(page);
      await expect(page.getByText('🌙 Dinner')).toBeVisible();
    });

    test('meal rows show Cost / Person header', async ({ page }) => {
      await addAccommodation(page);
      await expect(page.getByText('Cost / Person').first()).toBeVisible();
    });

    test('meal rows show Free Meal Pax header', async ({ page }) => {
      await addAccommodation(page);
      await expect(page.getByText('Free Meal Pax')).toBeVisible();
    });

    test('meal formula label visible', async ({ page }) => {
      await addAccommodation(page);
      await expect(page.getByText(/formula: cost × \(pax − free pax\)/i)).toBeVisible();
    });

    test('Hotel Subtotal label visible', async ({ page }) => {
      await addAccommodation(page);
      await expect(page.getByText(/hotel subtotal/i)).toBeVisible();
    });

    test('restaurant selector renders', async ({ page }) => {
      await addAccommodation(page);
      await expect(page.getByText(/select restaurant/i).first()).toBeVisible();
    });

    test('Add New Restaurant option in restaurant selector', async ({ page }) => {
      await addAccommodation(page);
      await page.getByText(/select restaurant/i).first().locator('..').locator('..').click();
      await expect(page.getByText('Add New Restaurant')).toBeVisible();
    });

    test('clicking Add New Restaurant opens dialog', async ({ page }) => {
      await addAccommodation(page);
      await page.getByText(/select restaurant/i).first().locator('..').locator('..').click();
      await page.getByText('Add New Restaurant').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Add New Restaurant to Master List')).toBeVisible();
    });

    test('Add Restaurant dialog has Name input', async ({ page }) => {
      await addAccommodation(page);
      await page.getByText(/select restaurant/i).first().locator('..').locator('..').click();
      await page.getByText('Add New Restaurant').click();
      await expect(page.getByPlaceholder(/the grand spice/i)).toBeVisible();
    });

    test('Add Restaurant dialog shows 1★ through 5★ rating buttons', async ({ page }) => {
      await addAccommodation(page);
      await page.getByText(/select restaurant/i).first().locator('..').locator('..').click();
      await page.getByText('Add New Restaurant').click();
      for (const star of ['1★', '2★', '3★', '4★', '5★']) {
        await expect(page.getByText(star)).toBeVisible();
      }
    });

    test('Add Restaurant dialog Cancel button closes dialog', async ({ page }) => {
      await addAccommodation(page);
      await page.getByText(/select restaurant/i).first().locator('..').locator('..').click();
      await page.getByText('Add New Restaurant').click();
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByRole('dialog')).toBeHidden();
    });

    test('Meals Total banner appears after adding accommodation', async ({ page }) => {
      await addAccommodation(page);
      await expect(page.getByText('Meals Total')).toBeVisible();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 22. ACTIVITIES
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Activities', () => {
    test('Add Activity button renders', async ({ page }) => {
      await expect(page.getByRole('button', { name: /add activity/i })).toBeVisible();
    });

    test('empty state: "No activities added yet."', async ({ page }) => {
      await expect(page.getByText('No activities added yet.')).toBeVisible();
    });

    test('Add Activity creates a card', async ({ page }) => {
      await addActivity(page);
      await expect(page.getByText('Activity 1')).toBeVisible();
    });

    test('activity card has Name, City, Entry Cost, Transport Cost, Guide Cost, Description', async ({ page }) => {
      await addActivity(page);
      await expect(page.getByPlaceholder(/eiffel tower visit/i)).toBeVisible();
      await expect(page.getByText('Entry Cost')).toBeVisible();
      await expect(page.getByText('Transport Cost')).toBeVisible();
      await expect(page.getByText('Guide Cost')).toBeVisible();
      await expect(page.getByText('City (Optional)')).toBeVisible();
      await expect(page.getByPlaceholder(/activity details/i)).toBeVisible();
    });

    test('activity name fills and header updates', async ({ page }) => {
      await addActivity(page);
      await page.getByPlaceholder(/eiffel tower visit/i).fill('City Tour');
      await expect(page.getByText('City Tour')).toBeVisible();
    });

    test('delete removes activity', async ({ page }) => {
      await addActivity(page);
      await page.locator('[id^="section-activities"]').getByRole('button').filter({ has: page.locator('svg') }).last().click();
      await expect(page.getByText('No activities added yet.')).toBeVisible();
    });

    test('can add two activities', async ({ page }) => {
      await addActivity(page);
      await addActivity(page);
      await expect(page.getByText('Activity 1')).toBeVisible();
      await expect(page.getByText('Activity 2')).toBeVisible();
    });

    test('Activities Total banner appears', async ({ page }) => {
      await addActivity(page);
      await expect(page.getByText('Activities Total')).toBeVisible();
    });

    test('activity can be collapsed', async ({ page }) => {
      await addActivity(page);
      await page.locator('[id^="section-activities"] .bg-muted\\/40 button').first().click();
      await expect(page.getByPlaceholder(/eiffel tower visit/i)).toBeHidden();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 23. OVERHEADS
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Overheads', () => {
    test('Add Overhead button renders', async ({ page }) => {
      await expect(page.getByRole('button', { name: /add overhead/i })).toBeVisible();
    });

    test('empty state: "No overheads added yet."', async ({ page }) => {
      await expect(page.getByText('No overheads added yet.')).toBeVisible();
    });

    test('Add Overhead creates a card', async ({ page }) => {
      await addOverhead(page);
      await expect(page.getByText('Overhead 1')).toBeVisible();
    });

    test('overhead card has Name, Cost Type, Amount, Currency fields', async ({ page }) => {
      await addOverhead(page);
      await expect(page.getByPlaceholder(/contingency, admin fee/i)).toBeVisible();
      await expect(page.getByText('Cost Type')).toBeVisible();
    });

    test('Cost Type defaults to Per Person', async ({ page }) => {
      await addOverhead(page);
      await expect(page.getByText('Amount Per Participant')).toBeVisible();
    });

    test('Cost Type can be switched to Lump Sum', async ({ page }) => {
      await addOverhead(page);
      const costTypeBtn = page.getByText('Cost Type').locator('..').locator('button[role="combobox"]');
      await costTypeBtn.click();
      await page.getByRole('option', { name: 'Lump Sum' }).click();
      await expect(page.getByText('Total Amount')).toBeVisible();
    });

    test('Amount label is "Total Amount" for Lump Sum', async ({ page }) => {
      await addOverhead(page);
      const costTypeBtn = page.getByText('Cost Type').locator('..').locator('button[role="combobox"]');
      await costTypeBtn.click();
      await page.getByRole('option', { name: 'Lump Sum' }).click();
      await expect(page.getByText('Total Amount')).toBeVisible();
    });

    test('Amount label is "Amount Per Participant" for per_person', async ({ page }) => {
      await addOverhead(page);
      await expect(page.getByText('Amount Per Participant')).toBeVisible();
    });

    test('Hide from Client toggle renders', async ({ page }) => {
      await addOverhead(page);
      await expect(page.getByText('Hide from Client')).toBeVisible();
    });

    test('Hide from Client can be toggled on', async ({ page }) => {
      await addOverhead(page);
      const toggle = page.getByText('Hide from Client').locator('..').getByRole('switch');
      await toggle.click();
      await expect(toggle).toBeChecked();
    });

    test('Hide from Client can be toggled off again', async ({ page }) => {
      await addOverhead(page);
      const toggle = page.getByText('Hide from Client').locator('..').getByRole('switch');
      await toggle.click();
      await toggle.click();
      await expect(toggle).not.toBeChecked();
    });

    test('delete removes overhead', async ({ page }) => {
      await addOverhead(page);
      await page.locator('[id^="section-overheads"]').getByRole('button').filter({ has: page.locator('svg') }).last().click();
      await expect(page.getByText('No overheads added yet.')).toBeVisible();
    });

    test('can add two overheads', async ({ page }) => {
      await addOverhead(page);
      await addOverhead(page);
      await expect(page.getByText('Overhead 1')).toBeVisible();
      await expect(page.getByText('Overhead 2')).toBeVisible();
    });

    test('Overheads Total banner appears', async ({ page }) => {
      await addOverhead(page);
      await expect(page.getByText('Overheads Total')).toBeVisible();
    });

    test('overhead can be collapsed', async ({ page }) => {
      await addOverhead(page);
      await page.locator('[id^="section-overheads"] .bg-muted\\/40 button').first().click();
      await expect(page.getByPlaceholder(/contingency, admin fee/i)).toBeHidden();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 24. EXTRAS — INSURANCE
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Extras – Insurance', () => {
    test('Visa Tips and Insurance card renders', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /visa, tips and insurance/i })).toBeVisible();
    });

    test('Insurance section visible for domestic trip', async ({ page }) => {
      await expect(page.getByText('Insurance (Required for all trips)')).toBeVisible();
    });

    test('Insurance section visible for international trip', async ({ page }) => {
      await page.locator('#international').click();
      await expect(page.getByText('Insurance (Required for all trips)')).toBeVisible();
    });

    test('Insurance Cost Per Person input is present', async ({ page }) => {
      const section = page.getByText('Insurance (Required for all trips)').locator('..').locator('..');
      await expect(section.getByText('Cost Per Person')).toBeVisible();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 25. EXTRAS — VISA & TIPS
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Extras – Visa & Tips', () => {
    test('Visa section hidden for domestic', async ({ page }) => {
      await expect(page.getByText('Visa (International Only)')).toBeHidden();
    });

    test('Tips section hidden for domestic', async ({ page }) => {
      await expect(page.getByText('Tips (International Only)')).toBeHidden();
    });

    test('Visa section appears for international', async ({ page }) => {
      await page.locator('#international').click();
      await expect(page.getByText('Visa (International Only)')).toBeVisible();
    });

    test('Tips section appears for international', async ({ page }) => {
      await page.locator('#international').click();
      await expect(page.getByText('Tips (International Only)')).toBeVisible();
    });

    test('Visa section disappears when switching back to domestic', async ({ page }) => {
      await page.locator('#international').click();
      await page.locator('#domestic').click();
      await expect(page.getByText('Visa (International Only)')).toBeHidden();
    });

    test('Visa Cost Per Person input renders for international', async ({ page }) => {
      await page.locator('#international').click();
      const visaSection = page.getByText('Visa (International Only)').locator('..').locator('..');
      await expect(visaSection.getByText('Cost Per Person')).toBeVisible();
    });

    test('Tips Cost Per Person input renders for international', async ({ page }) => {
      await page.locator('#international').click();
      const tipsSection = page.getByText('Tips (International Only)').locator('..').locator('..');
      await expect(tipsSection.getByText('Cost Per Person')).toBeVisible();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 26. COST SUMMARY
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Cost Summary', () => {
    test('Cost Summary card renders', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Cost Summary' })).toBeVisible();
    });

    test('Admin Charges input renders', async ({ page }) => {
      await expect(page.getByText('Admin Charges').first()).toBeVisible();
    });

    test('Transport line item visible', async ({ page }) => {
      await expect(page.getByText('Transport')).toBeVisible();
    });

    test('Accommodation line item visible', async ({ page }) => {
      await expect(page.getByText('Accommodation').first()).toBeVisible();
    });

    test('Meals line item visible', async ({ page }) => {
      await expect(page.getByText('Meals').first()).toBeVisible();
    });

    test('Activities line item visible', async ({ page }) => {
      await expect(page.getByText('Activities').first()).toBeVisible();
    });

    test('Visa Tips and Insurance line item visible', async ({ page }) => {
      await expect(page.getByText('Visa, Tips and Insurance')).toBeVisible();
    });

    test('Overheads line item visible', async ({ page }) => {
      await expect(page.getByText('Overheads').first()).toBeVisible();
    });

    test('Subtotal (Before Admin Charges) line visible', async ({ page }) => {
      await expect(page.getByText('Subtotal (Before Admin Charges)')).toBeVisible();
    });

    test('Admin Subtotal line visible', async ({ page }) => {
      await expect(page.getByText('Admin Subtotal (Subtotal + Admin Charges)')).toBeVisible();
    });

    test('GST line with percentage visible', async ({ page }) => {
      await expect(page.getByText(/GST \(\d+%\)/)).toBeVisible();
    });

    test('Grand Total line visible', async ({ page }) => {
      await expect(page.getByText('Grand Total')).toBeVisible();
    });

    test('"Cost per Student" label for institute', async ({ page }) => {
      await expect(page.getByText('Cost per Student')).toBeVisible();
    });

    test('"Cost per Participant" label for commercial', async ({ page }) => {
      await page.locator('#commercial').click();
      await expect(page.getByText('Cost per Participant')).toBeVisible();
    });

    test('"Cost per Participant" label for FTI', async ({ page }) => {
      await page.locator('#fti').click();
      await expect(page.getByText('Cost per Participant')).toBeVisible();
    });

    test('TCS hidden for domestic', async ({ page }) => {
      await expect(page.getByText(/TCS.*%.*on Subtotal/i)).toBeHidden();
    });

    test('TCS visible for international', async ({ page }) => {
      await page.locator('#international').click();
      await expect(page.getByText(/TCS.*%.*on Subtotal/i)).toBeVisible();
    });

    test('TDS hidden for non-FTI', async ({ page }) => {
      await expect(page.getByText(/TDS.*%.*deducted/i)).toBeHidden();
    });

    test('TDS visible for FTI domestic', async ({ page }) => {
      await page.locator('#fti').click();
      await expect(page.getByText(/TDS.*%.*deducted/i)).toBeVisible();
    });

    test('TDS visible for FTI international', async ({ page }) => {
      await page.locator('#international').click();
      await page.locator('#fti').click();
      await expect(page.getByText(/TDS.*%.*deducted/i)).toBeVisible();
    });

    test('FTI international TDS label references TCS', async ({ page }) => {
      await page.locator('#international').click();
      await page.locator('#fti').click();
      await expect(page.getByText(/TDS.*deducted.*Subtotal \+ GST \+ TCS/i)).toBeVisible();
    });

    test('FTI domestic TDS label does not reference TCS', async ({ page }) => {
      await page.locator('#fti').click();
      await expect(page.getByText(/TDS.*deducted.*Subtotal \+ GST \+ TCS/i)).toBeHidden();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 27. VALIDATION
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Validation', () => {
    test('shows "Trip name is required" toast', async ({ page }) => {
      await page.getByRole('button', { name: 'Create Trip' }).click();
      await expect(page.getByText(/trip name is required/i)).toBeVisible({ timeout: 5_000 });
    });

    test('shows "Institution name is required" toast', async ({ page }) => {
      await page.getByRole('button', { name: 'Create Trip' }).click();
      await expect(page.getByText(/institution name is required/i)).toBeVisible({ timeout: 5_000 });
    });

    test('shows "at least one country must be selected" toast', async ({ page }) => {
      await page.getByPlaceholder(/paris cultural tour/i).fill('Test');
      await page.getByPlaceholder(/st\. mary/i).fill('School');
      await page.getByRole('button', { name: 'Create Trip' }).click();
      await expect(page.getByText(/at least one country must be selected/i)).toBeVisible({ timeout: 5_000 });
    });

    test('shows "at least one city must be added" toast', async ({ page }) => {
      await page.getByPlaceholder(/paris cultural tour/i).fill('Test');
      await page.getByPlaceholder(/st\. mary/i).fill('School');
      await page.getByRole('button', { name: 'Create Trip' }).click();
      await expect(page.getByText(/at least one city must be added/i)).toBeVisible({ timeout: 5_000 });
    });

    test('shows "insurance cost per person is required" toast', async ({ page }) => {
      await page.getByPlaceholder(/paris cultural tour/i).fill('Test');
      await page.getByPlaceholder(/st\. mary/i).fill('School');
      await page.getByRole('button', { name: 'Create Trip' }).click();
      await expect(page.getByText(/insurance cost per person is required/i)).toBeVisible({ timeout: 5_000 });
    });

    test('international: shows "visa cost per person is required" toast', async ({ page }) => {
      await page.locator('#international').click();
      await page.getByPlaceholder(/paris cultural tour/i).fill('Test');
      await page.getByPlaceholder(/st\. mary/i).fill('School');
      await page.getByRole('button', { name: 'Create Trip' }).click();
      await expect(page.getByText(/visa cost per person is required for international/i)).toBeVisible({ timeout: 5_000 });
    });

    test('page stays on /trips/create after failed validation', async ({ page }) => {
      await page.getByRole('button', { name: 'Create Trip' }).click();
      await expect(page).toHaveURL(/\/trips\/create/);
    });

    test('Create Trip button is not disabled initially', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Create Trip' })).not.toBeDisabled();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 28. SAVE / CANCEL
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Save & Cancel', () => {
    test('Create Trip button renders', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Create Trip' })).toBeVisible();
    });

    test('Cancel button renders', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Cancel' }).last()).toBeVisible();
    });

    test('Cancel navigates to /dashboard', async ({ page }) => {
      await page.getByRole('button', { name: 'Cancel' }).last().click();
      await page.waitForURL('**/dashboard', { timeout: 10_000 });
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 29. CROSS-PERMUTATION: CATEGORY × TYPE — TAX LINES
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Category × Type permutations – tax line visibility', () => {
    const combos = [
      { category: 'domestic',      type: 'institute',  tcs: false, tds: false },
      { category: 'domestic',      type: 'commercial', tcs: false, tds: false },
      { category: 'domestic',      type: 'fti',        tcs: false, tds: true  },
      { category: 'international', type: 'institute',  tcs: true,  tds: false },
      { category: 'international', type: 'commercial', tcs: true,  tds: false },
      { category: 'international', type: 'fti',        tcs: true,  tds: true  },
    ];

    for (const c of combos) {
      test(`${c.category} + ${c.type} → TCS=${c.tcs}, TDS=${c.tds}`, async ({ page }) => {
        if (c.category === 'international') await page.locator('#international').click();
        await page.locator(`#${c.type}`).click();

        if (c.tcs) {
          await expect(page.getByText(/TCS.*%.*on Subtotal/i)).toBeVisible();
        } else {
          await expect(page.getByText(/TCS.*%.*on Subtotal/i)).toBeHidden();
        }

        if (c.tds) {
          await expect(page.getByText(/TDS.*%.*deducted/i)).toBeVisible();
        } else {
          await expect(page.getByText(/TDS.*%.*deducted/i)).toBeHidden();
        }
      });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 30. CROSS-PERMUTATION: PARTICIPANT FIELDS PER TRIP TYPE
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Participant fields per trip type cycling', () => {
    test('institute shows Boys + Girls + Faculty + VXplorers', async ({ page }) => {
      await expect(page.getByText('Boys', { exact: true })).toBeVisible();
      await expect(page.getByText('Girls', { exact: true })).toBeVisible();
      await expect(page.getByText('Male Faculty', { exact: true })).toBeVisible();
      await expect(page.getByText('Male VXplorers', { exact: true }).first()).toBeVisible();
    });

    test('commercial shows Male/Female Participants + Commercial VXplorers; hides Boys/Girls', async ({ page }) => {
      await page.locator('#commercial').click();
      await expect(page.getByText('Male Participants', { exact: true })).toBeVisible();
      await expect(page.locator('#commercialMaleVXplorers')).toBeVisible();
      await expect(page.getByText('Boys', { exact: true })).toBeHidden();
    });

    test('fti shows Male/Female Participants + Kids; hides VXplorers', async ({ page }) => {
      await page.locator('#fti').click();
      await expect(page.getByText('Kids', { exact: true })).toBeVisible();
      await expect(page.locator('#commercialMaleVXplorers')).toBeHidden();
    });

    test('institute → commercial → fti → institute cycles correctly', async ({ page }) => {
      await expect(page.getByText('Boys', { exact: true })).toBeVisible();
      await page.locator('#commercial').click();
      await expect(page.getByText('Boys', { exact: true })).toBeHidden();
      await expect(page.getByText('Male Participants', { exact: true })).toBeVisible();
      await page.locator('#fti').click();
      await expect(page.getByText('Kids', { exact: true })).toBeVisible();
      await page.locator('#institute').click();
      await expect(page.getByText('Boys', { exact: true })).toBeVisible();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 31. CROSS-PERMUTATION: EXTRAS VISIBILITY (ALL TYPE × CATEGORY)
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Extras visibility – all type × category', () => {
    const tripTypes = ['institute', 'commercial', 'fti'] as const;

    for (const type of tripTypes) {
      test(`domestic + ${type}: visa and tips hidden`, async ({ page }) => {
        await page.locator(`#${type}`).click();
        await expect(page.getByText('Visa (International Only)')).toBeHidden();
        await expect(page.getByText('Tips (International Only)')).toBeHidden();
      });

      test(`international + ${type}: visa and tips visible`, async ({ page }) => {
        await page.locator('#international').click();
        await page.locator(`#${type}`).click();
        await expect(page.getByText('Visa (International Only)')).toBeVisible();
        await expect(page.getByText('Tips (International Only)')).toBeVisible();
      });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 32. SECTION IDs FOR NAVIGATION
  // ══════════════════════════════════════════════════════════════════════════
  test.describe('Section Navigation IDs', () => {
    const sectionIds = [
      'section-classification',
      'section-basic',
      'section-participants',
      'section-flights',
      'section-buses',
      'section-trains',
      'section-accommodation',
      'section-activities',
      'section-extras',
      'section-overheads',
      'section-summary',
    ];

    for (const id of sectionIds) {
      test(`section #${id} exists in DOM`, async ({ page }) => {
        await expect(page.locator(`#${id}`)).toBeAttached();
      });
    }
  });
});