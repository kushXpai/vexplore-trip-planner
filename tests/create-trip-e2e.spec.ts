// tests/create-trip-e2e.spec.ts
/**
 * End-to-End Trip Creation – Full Database Insert Suite
 *
 * Creates TWO complete trips with REAL Supabase writes (no mocking).
 *
 *  Trip 1 – DOMESTIC · INSTITUTE · SELF-PLANNED
 *    Cities     : Delhi, Mumbai, Agra, Kolkata  (~10 days)
 *    Flights    : 3  (DEL→BOM, BOM→AGR, AGR→CCU)
 *    Buses      : 2
 *    Hotels     : 1 per city (adds new via dialog if not found)
 *    Meals      : Breakfast / Lunch / Dinner per hotel
 *    Activities : 3
 *    Extras     : Insurance only (Visa/Tips hidden for domestic)
 *    Profit     : ₹5,00,000
 *
 *  Trip 2 – INTERNATIONAL · COMMERCIAL · TOUR PLANNER
 *    Cities     : New York, Boston, San Francisco  (~10 days)
 *    Flights    : 3  (JFK→BOS, BOS→SFO, SFO→JFK) in USD
 *    Buses      : 2  in USD
 *    Hotels     : 1 per city (adds new via dialog if not found)
 *    Meals      : Breakfast / Lunch / Dinner per hotel in USD
 *    Activities : 3  in USD
 *    Extras     : Visa + Tips + Insurance
 *    Profit     : ₹10,00,000
 *
 * Run with a SINGLE worker:
 *   npx playwright test tests/create-trip-e2e.spec.ts --workers=1 --headed --project=chromium
 */

import { test, expect, Page } from '@playwright/test';
import { navigateTo } from './helpers/auth.helper';

// ─── Timing ──────────────────────────────────────────────────────────────────
const S = 400;    // short  – after simple UI mutations
const M = 900;    // medium – after select choices (lists re-render)
const L = 2_500;  // long   – after Supabase round-trips

// ─── Utility ─────────────────────────────────────────────────────────────────

async function waitReady(page: Page) {
  await expect(page.getByText('Loading...')).toBeHidden({ timeout: 20_000 });
  await page.waitForLoadState('networkidle');
}

/** Click a shadcn SelectTrigger then pick the matching listbox option. */
async function pickOption(page: Page, trigger: ReturnType<Page['locator']>, optionText: string) {
  await trigger.waitFor({ state: 'visible', timeout: 10_000 });
  await trigger.click();
  await page.waitForTimeout(S);
  await page.getByRole('option', { name: optionText, exact: false }).first().click();
  await page.waitForTimeout(S);
}

// ─── Add City ────────────────────────────────────────────────────────────────
//
// JSX of the "New City" panel (class="rounded-lg border p-4 space-y-3 bg-muted/30"):
//   <p class="text-sm font-medium">New City</p>
//   <div class="grid grid-cols-2 gap-3">
//     <div class="space-y-1">            ← slot 0: Country
//       <Label class="text-xs">Country</Label>
//       <Select><SelectTrigger/></Select>   ← combobox 0 inside form
//     </div>
//     <div class="space-y-1">            ← slot 1: City
//       <Label class="text-xs">City</Label>
//       <Select><SelectTrigger/></Select>   ← combobox 1 inside form
//     </div>
//   </div>
//   {selectedCityForAdd && (             ← date inputs, conditional
//     <div class="grid grid-cols-2 gap-3">
//       <input type="date" />  ← From Date
//       <input type="date" />  ← To Date
//     </div>
//   )}
//   <div class="flex gap-2">
//     <Button>+ Add City</Button>   ← confirm
//     <Button variant="outline">Cancel</Button>
//   </div>
//
// Strategy: anchor on the unique <p>New City</p> text, go up one level (..)
// to get the panel div, then pick comboboxes by index (0=Country, 1=City).

async function addCity(
  page: Page,
  countryName: string,
  cityName: string,
  fromDate: string,
  toDate: string,
) {
  await page.getByRole('button', { name: /^add city$/i }).click();
  await page.waitForTimeout(S);

  // Panel anchor — "New City" <p> is a direct child of the panel div
  const panel = page.locator('p.text-sm.font-medium', { hasText: 'New City' }).locator('..');

  // combobox 0 = Country, combobox 1 = City
  await pickOption(page, panel.locator('button[role="combobox"]').nth(0), countryName);
  await page.waitForTimeout(M); // wait for city list to populate

  await pickOption(page, panel.locator('button[role="combobox"]').nth(1), cityName);
  await page.waitForTimeout(S);

  // Date inputs appear after city is selected
  const dates = panel.locator('input[type="date"]');
  await dates.nth(0).waitFor({ state: 'visible', timeout: 6_000 });
  await dates.nth(0).fill(fromDate);
  await dates.nth(1).fill(toDate);
  await page.waitForTimeout(S);

  // Confirm button (first button in the flex row at the bottom of the panel)
  await panel.locator('div.flex.gap-2').getByRole('button').first().click();
  await page.waitForTimeout(M);
}

// ─── Add Flight ───────────────────────────────────────────────────────────────
//
// Each flight card wrapper: div.border.rounded-lg.bg-card.overflow-hidden
// Card body (when expanded): div.p-4.space-y-5
//
// The summary in the header is:
//   `${flight.from} → ${flight.to}`  if both are filled
//   `Flight ${index + 1}`             if both are empty
// → After filling From/To the header shows "DEL → BOM", NOT "Flight 1".
//   Assert on the route text or airline instead.
//
// Currency SelectTrigger has className="w-48" → button.w-48[role="combobox"]
//
// Class row (after clicking "Add Class"):
//   div.grid-cols-[1fr_1fr_1fr_32px].gap-3.items-end.p-3.rounded-lg.bg-muted/30.border
//   Children: Cabin Class Select | Passengers input | Cost/Person input | Delete btn
//   → number inputs: nth(0)=Passengers, nth(1)=Cost/Person

async function addFlight(page: Page, opts: {
  from: string; to: string; airline: string; flightNumber: string;
  passengers: number; costPerPerson: number; currency?: string;
}) {
  await page.getByRole('button', { name: /add flight/i }).click();
  await page.waitForTimeout(S);

  const card = page.locator('#section-flights .border.rounded-lg.bg-card').last();
  const body = card.locator('div.p-4.space-y-5');

  await body.locator('input[placeholder="Departure city"]').fill(opts.from);
  await body.locator('input[placeholder="Arrival city"]').fill(opts.to);
  await body.locator('input[placeholder="e.g., Air India"]').fill(opts.airline);
  await body.locator('input[placeholder="e.g., AI 101"]').fill(opts.flightNumber);

  // Currency — SelectTrigger has class "w-48" applied directly
  if (opts.currency && opts.currency !== 'INR') {
    const currTrigger = body.locator('button[role="combobox"].w-48');
    await pickOption(page, currTrigger, opts.currency);
  }

  // Add one cabin-class entry
  await card.getByRole('button', { name: /add class/i }).click();
  await page.waitForTimeout(S);

  // The class row is the last element with these exact Tailwind classes
  // (Playwright escapes "/" in CSS selectors with "\/" → use the JS string as-is)
  const classRow = card.locator('[class*="bg-muted/30"][class*="border"]').last();
  const classNums = classRow.locator('input[type="number"]');
  await classNums.nth(0).fill(String(opts.passengers));   // Passengers
  await classNums.nth(1).fill(String(opts.costPerPerson)); // Cost/Person
  await page.waitForTimeout(S);
}

// ─── Add Bus ──────────────────────────────────────────────────────────────────
//
// Bus card body: div.p-4.space-y-4
// Number inputs in DOM order inside the body:
//   nth(0) Seating Capacity   (grid row 1, col 2)
//   nth(1) Cost Per Bus       (grid row 2, col 1)
//   nth(2) Number of Days     (grid row 2, col 3)
//   nth(3) Quantity           (standalone)
// Currency Select: only combobox in the body

async function addBus(page: Page, opts: {
  name: string; capacity: number; costPerBus: number;
  days: number; quantity: number; currency?: string;
}) {
  await page.getByRole('button', { name: /add bus/i }).click();
  await page.waitForTimeout(S);

  const card = page.locator('#section-buses .border.rounded-lg.bg-card').last();
  const body = card.locator('div.p-4.space-y-4');

  await body.locator('input[placeholder="e.g., Volvo AC Sleeper"]').fill(opts.name);

  const nums = body.locator('input[type="number"]');
  await nums.nth(0).fill(String(opts.capacity));
  await nums.nth(1).fill(String(opts.costPerBus));
  await nums.nth(2).fill(String(opts.days));
  await nums.nth(3).fill(String(opts.quantity));

  if (opts.currency && opts.currency !== 'INR') {
    await pickOption(page, body.locator('button[role="combobox"]').first(), opts.currency);
  }
  await page.waitForTimeout(S);
}

// ─── Add Accommodation ────────────────────────────────────────────────────────
//
// Accommodation card body: div.p-6.space-y-6
//
// Comboboxes inside the body, in DOM order:
//   nth(0) City       (grid-cols-2 row, col 1)
//   nth(1) Hotel      (grid-cols-2 row, col 2)
//   nth(2) Currency   (grid-cols-3 row, col 2)
//   nth(3) Load Preset (inside Room Types section)
//
// Breakfast Included: <Switch> rendered as button[role="switch"], comes BEFORE
// the label text in the JSX (no wrapping <label>). It is the FIRST switch in body.
//
// "Add new hotel" link: plain <button type="button" class="text-xs ...underline...">
// → locate by its underline class OR by hasText

async function addAccommodation(page: Page, opts: {
  cityName: string; hotelName: string; nights: number;
  roomCostPerRoom: number; currency?: string;
  breakfastIncluded?: boolean; driverRoom?: boolean;
}) {
  await page.getByRole('button', { name: /add hotel/i }).click();
  await page.waitForTimeout(S);

  const card = page.locator('#section-accommodation .border.rounded-lg.bg-card').last();
  const body = card.locator('div.p-6.space-y-6');

  // ── City (combobox 0) ──
  await pickOption(page, body.locator('button[role="combobox"]').nth(0), opts.cityName);
  await page.waitForTimeout(M);

  // ── Hotel (combobox 1) ── select existing or open add-hotel dialog
  const hotelTrigger = body.locator('button[role="combobox"]').nth(1);
  await hotelTrigger.waitFor({ state: 'visible', timeout: 6_000 });
  await hotelTrigger.click();
  await page.waitForTimeout(S);

  const hotelOption = page.getByRole('option', { name: opts.hotelName, exact: false });
  const hotelExists = await hotelOption.isVisible({ timeout: 1_500 }).catch(() => false);

  if (hotelExists) {
    await hotelOption.click();
    await page.waitForTimeout(S);
  } else {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(S);
    // The link is: <button type="button" class="text-xs text-muted-foreground underline ...">
    // It appears AFTER the hotel Select inside the same space-y-2 wrapper.
    // Use getByText to find it — it always contains "add new hotel"
    await body.getByText(/add new hotel/i).click();
    await page.waitForTimeout(S);

    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible', timeout: 8_000 });
    await dialog.locator('input').first().fill(opts.hotelName);
    await dialog.getByRole('button', { name: /^add hotel$/i }).click();
    await page.waitForTimeout(L);
  }

  // ── Number of Nights (first number input in body) ──
  await body.locator('input[type="number"]').first().fill(String(opts.nights));

  // ── Breakfast Included (first switch in body) ──
  if (opts.breakfastIncluded) {
    const bfSwitch = body.locator('button[role="switch"]').first();
    if (!(await bfSwitch.isChecked())) await bfSwitch.click();
  }

  // ── Currency (combobox 2) ──
  if (opts.currency && opts.currency !== 'INR') {
    await pickOption(page, body.locator('button[role="combobox"]').nth(2), opts.currency);
  }

  // ── Add a Double room type ──
  await body.getByRole('button', { name: /add room type/i }).click();
  await page.waitForTimeout(S);

  // Room type row: div.grid-cols-4.gap-4.items-end (last one added)
  // Children: Room Type text input | Capacity number (placeholder="2") | Cost number | Delete
  const roomRow = body.locator('.grid-cols-4').last();
  await roomRow.locator('input[placeholder="e.g., Double, Triple"]').fill('Double');
  await roomRow.locator('input[type="number"]').nth(0).fill('2');                           // capacity
  await roomRow.locator('input[type="number"]').nth(1).fill(String(opts.roomCostPerRoom)); // cost per room

  // ── Driver Room (second switch in body) ──
  if (opts.driverRoom) {
    const driverSwitch = body.locator('button[role="switch"]').nth(1);
    if (!(await driverSwitch.isChecked())) await driverSwitch.click();
  }

  await page.waitForTimeout(S);
}

// ─── Fill Meals ───────────────────────────────────────────────────────────────
//
// #section-meals > CardContent contains one block per accommodation.
// Each block is a div.rounded-lg.border — identified by presence of "🌅 Breakfast".
// Inside each block, meal rows are: div.grid-cols-[140px_1fr_1fr_1fr]
// First input[type="number"] in each row = Cost / Person.
// Currency selector = first button[role="combobox"] in the block.

async function fillMeals(page: Page, hotelIndex: number, opts: {
  breakfastCost: number; lunchCost: number; dinnerCost: number; currency?: string;
}) {
  const mealsCard = page.locator('#section-meals');
  const blocks    = mealsCard.locator('.rounded-lg.border').filter({ hasText: '🌅 Breakfast' });
  const block     = blocks.nth(hotelIndex);

  if (opts.currency && opts.currency !== 'INR') {
    await pickOption(page, block.locator('button[role="combobox"]').first(), opts.currency);
  }

  // Use attribute selector to escape the brackets in the Tailwind class name
  const grid = 'div[class*="grid-cols-[140px"]';

  await block.locator(grid).filter({ hasText: '🌅 Breakfast' }).locator('input[type="number"]').first().fill(String(opts.breakfastCost));
  await block.locator(grid).filter({ hasText: '☀️ Lunch' }).locator('input[type="number"]').first().fill(String(opts.lunchCost));
  await block.locator(grid).filter({ hasText: '🌙 Dinner' }).locator('input[type="number"]').first().fill(String(opts.dinnerCost));
  await page.waitForTimeout(S);
}

// ─── Add Activity ─────────────────────────────────────────────────────────────
//
// Activity card body: div.p-4.space-y-4
// Number inputs in DOM order: Entry Cost, Transport Cost, Guide Cost
// Currency: only combobox in the body

async function addActivity(page: Page, opts: {
  name: string; entryCost: number; transportCost: number; guideCost: number; currency?: string;
}) {
  await page.getByRole('button', { name: /add activity/i }).click();
  await page.waitForTimeout(S);

  const card = page.locator('#section-activities .border.rounded-lg.bg-card').last();
  const body = card.locator('div.p-4.space-y-4');

  await body.locator('input[placeholder*="Eiffel Tower"]').fill(opts.name);

  const nums = body.locator('input[type="number"]');
  await nums.nth(0).fill(String(opts.entryCost));
  await nums.nth(1).fill(String(opts.transportCost));
  await nums.nth(2).fill(String(opts.guideCost));

  if (opts.currency && opts.currency !== 'INR') {
    await pickOption(page, body.locator('button[role="combobox"]').first(), opts.currency);
  }
  await page.waitForTimeout(S);
}

// ─── Fill Participant count ───────────────────────────────────────────────────
//
// Participant inputs: plain <Input> with only a sibling <Label> above them.
// No htmlFor IDs.  Use XPath following-sibling to jump from label to input.

async function fillParticipant(page: Page, labelText: string, value: string) {
  const section = page.locator('#section-participants');
  const input   = section
    .locator('label', { hasText: labelText })
    .locator('xpath=following-sibling::input')
    .first();
  await input.fill(value);
  await page.waitForTimeout(100);
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe.configure({ mode: 'serial' });

test.describe('E2E – Create Full Trips (Real DB Inserts)', () => {

  // ══════════════════════════════════════════════════════════════════════════
  // TRIP 1 – Domestic · Institute · Self-Planned
  // ══════════════════════════════════════════════════════════════════════════
  test('Trip 1 – Domestic / Institute / Self-Planned  (Delhi → Mumbai → Agra → Kolkata)', async ({ page }) => {
    await navigateTo(page, '/trips/create');
    await waitReady(page);

    // ── 1. Classification ────────────────────────────────────────────────
    await page.locator('#domestic').click();
    await page.locator('#institute').click();
    await page.locator('#self_planned').click();
    await expect(page.locator('#domestic')).toBeChecked();
    await expect(page.locator('#institute')).toBeChecked();
    await expect(page.locator('#self_planned')).toBeChecked();

    // ── 2. Basic Info ────────────────────────────────────────────────────
    await page.getByPlaceholder(/paris cultural tour/i).fill('India Heritage Tour 2026');
    await page.getByPlaceholder(/st\. mary/i).fill('Delhi Public School');

    // ── 3. Itinerary – 4 cities (~10 days) ──────────────────────────────
    await addCity(page, 'India', 'Delhi',   '2026-04-01', '2026-04-03');
    await addCity(page, 'India', 'Mumbai',  '2026-04-03', '2026-04-06');
    await addCity(page, 'India', 'Agra',    '2026-04-06', '2026-04-08');
    await addCity(page, 'India', 'Kolkata', '2026-04-08', '2026-04-11');

    // Verify all 4 cities appear in the itinerary list
    const basicSection = page.locator('#section-basic');
    await expect(basicSection.getByText('Delhi')).toBeVisible();
    await expect(basicSection.getByText('Mumbai')).toBeVisible();
    await expect(basicSection.getByText('Agra')).toBeVisible();
    await expect(basicSection.getByText('Kolkata')).toBeVisible();

    // ── 4. Participants (Institute) ──────────────────────────────────────
    await fillParticipant(page, 'Boys',             '30');
    await fillParticipant(page, 'Girls',            '25');
    await fillParticipant(page, 'Male Faculty',     '3');
    await fillParticipant(page, 'Female Faculty',   '2');
    await fillParticipant(page, 'Male VXplorers',   '1');
    await fillParticipant(page, 'Female VXplorers', '1');

    // ── 5. Flights – 3 ───────────────────────────────────────────────────
    await addFlight(page, { from: 'DEL', to: 'BOM', airline: 'IndiGo',    flightNumber: '6E 101', passengers: 62, costPerPerson: 3500 });
    await addFlight(page, { from: 'BOM', to: 'AGR', airline: 'Air India', flightNumber: 'AI 202', passengers: 62, costPerPerson: 2800 });
    await addFlight(page, { from: 'AGR', to: 'CCU', airline: 'SpiceJet',  flightNumber: 'SG 303', passengers: 62, costPerPerson: 3200 });

    // The header shows the route once From/To are filled (not "Flight N")
    await expect(page.getByText('DEL → BOM')).toBeVisible();
    await expect(page.getByText('BOM → AGR')).toBeVisible();
    await expect(page.getByText('AGR → CCU')).toBeVisible();

    // ── 6. Buses – 2 ─────────────────────────────────────────────────────
    await addBus(page, { name: 'Volvo AC Sleeper', capacity: 40, costPerBus: 8000, days: 10, quantity: 2 });
    await addBus(page, { name: 'Mini Coach',       capacity: 22, costPerBus: 4500, days:  5, quantity: 1 });
    await expect(page.getByText('Volvo AC Sleeper')).toBeVisible();
    await expect(page.getByText('Mini Coach')).toBeVisible();

    // ── 7. Accommodation – 1 hotel per city ─────────────────────────────
    await addAccommodation(page, { cityName: 'Delhi',   hotelName: 'The Imperial Delhi',      nights: 2, roomCostPerRoom: 4500, breakfastIncluded: true,  driverRoom: true  });
    await addAccommodation(page, { cityName: 'Mumbai',  hotelName: 'Taj Mahal Palace Mumbai', nights: 3, roomCostPerRoom: 7000, breakfastIncluded: false });
    await addAccommodation(page, { cityName: 'Agra',    hotelName: 'Hotel Agra Heritage',     nights: 2, roomCostPerRoom: 3200, breakfastIncluded: true  });
    await addAccommodation(page, { cityName: 'Kolkata', hotelName: 'Park Hotel Kolkata',      nights: 3, roomCostPerRoom: 4000, breakfastIncluded: false });

    // ── 8. Meals ─────────────────────────────────────────────────────────
    await fillMeals(page, 0, { breakfastCost:   0, lunchCost: 250, dinnerCost: 350 }); // Delhi
    await fillMeals(page, 1, { breakfastCost: 200, lunchCost: 300, dinnerCost: 450 }); // Mumbai
    await fillMeals(page, 2, { breakfastCost:   0, lunchCost: 200, dinnerCost: 300 }); // Agra
    await fillMeals(page, 3, { breakfastCost: 180, lunchCost: 250, dinnerCost: 380 }); // Kolkata

    // ── 9. Activities – 3 ────────────────────────────────────────────────
    await addActivity(page, { name: 'Red Fort Visit',    entryCost: 35, transportCost: 500, guideCost:  800 });
    await addActivity(page, { name: 'Taj Mahal Tour',    entryCost: 50, transportCost: 600, guideCost: 1000 });
    await addActivity(page, { name: 'Victoria Memorial', entryCost: 20, transportCost: 400, guideCost:  600 });

    // ── 10. Extras – Insurance only (domestic) ───────────────────────────
    await expect(page.getByText('Visa (International Only)')).toBeHidden();
    await expect(page.getByText('Tips (International Only)')).toBeHidden();

    // Insurance block: div.space-y-4 inside #section-extras that has the h4 text
    const insuranceBlock = page.locator('#section-extras')
      .locator('div.space-y-4')
      .filter({ hasText: 'Insurance (Required for all trips)' });
    await insuranceBlock.locator('input[type="number"]').first().fill('150');

    // ── 11. Admin Charges – ₹5,00,000 ────────────────────────────────────
    // div.bg-primary/5 panel inside #section-summary, only number input in it
    const adminPanel = page.locator('#section-summary')
      .locator('div')
      .filter({ hasText: /^Admin Charges$/ })
      .locator('..')   // go up to the bg-primary/5 panel
      .first();
    await adminPanel.locator('input[type="number"]').first().fill('500000');
    await page.waitForTimeout(S);

    // ── 12. Verify tax lines ──────────────────────────────────────────────
    await expect(page.getByText(/TCS.*%.*on Subtotal/i)).toBeHidden();
    await expect(page.getByText(/TDS.*%.*deducted/i)).toBeHidden();
    await expect(page.getByText(/GST \(\d+%\)/)).toBeVisible();
    await expect(page.getByText('Grand Total')).toBeVisible();

    // ── 13. Submit ────────────────────────────────────────────────────────
    await page.getByRole('button', { name: /create trip/i }).click();
    await page.waitForURL(/\/trips\/(?!create)/, { timeout: 45_000 });
    await expect(page).not.toHaveURL(/\/trips\/create/);

    await expect(
      page.locator('[data-sonner-toaster]').getByText(/trip created|saved successfully/i)
    ).toBeVisible({ timeout: 12_000 });

    console.log('✅ Trip 1 (Domestic/Institute/Self-Planned) inserted →', page.url());
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TRIP 2 – International · Commercial · Tour Planner
  // ══════════════════════════════════════════════════════════════════════════
  test('Trip 2 – International / Commercial / Tour Planner  (New York → Boston → San Francisco)', async ({ page }) => {
    await navigateTo(page, '/trips/create');
    await waitReady(page);

    // ── 1. Classification ────────────────────────────────────────────────
    await page.locator('#international').click();
    await page.locator('#commercial').click();
    await page.locator('#tour_planner').click();
    await expect(page.locator('#international')).toBeChecked();
    await expect(page.locator('#commercial')).toBeChecked();
    await expect(page.locator('#tour_planner')).toBeChecked();
    await expect(page.getByText('International Trip - Tax Info')).toBeVisible();

    // ── 2. Basic Info ────────────────────────────────────────────────────
    await page.getByPlaceholder(/paris cultural tour/i).fill('USA East & West Coast 2026');
    await page.getByPlaceholder(/acme corp/i).fill('Global Adventures Pvt Ltd');

    // ── 3. Itinerary – 3 cities (10 days) ───────────────────────────────
    await addCity(page, 'United States', 'New York',      '2026-06-15', '2026-06-19');
    await addCity(page, 'United States', 'Boston',        '2026-06-19', '2026-06-22');
    await addCity(page, 'United States', 'San Francisco', '2026-06-22', '2026-06-25');

    const basicSection = page.locator('#section-basic');
    await expect(basicSection.getByText('New York')).toBeVisible();
    await expect(basicSection.getByText('Boston')).toBeVisible();
    await expect(basicSection.getByText('San Francisco')).toBeVisible();

    // ── 4. Participants (Commercial) ─────────────────────────────────────
    await fillParticipant(page, 'Male Participants',   '15');
    await fillParticipant(page, 'Female Participants', '12');
    await fillParticipant(page, 'Kids',                '3');
    // These two have explicit htmlFor IDs in the component
    await page.locator('#commercialMaleVXplorers').fill('2');
    await page.locator('#commercialFemaleVXplorers').fill('1');

    // ── 5. Flights – 3 (USD) ─────────────────────────────────────────────
    await addFlight(page, { from: 'JFK', to: 'BOS', airline: 'American Airlines', flightNumber: 'AA 501', passengers: 33, costPerPerson: 180, currency: 'USD' });
    await addFlight(page, { from: 'BOS', to: 'SFO', airline: 'United Airlines',   flightNumber: 'UA 602', passengers: 33, costPerPerson: 320, currency: 'USD' });
    await addFlight(page, { from: 'SFO', to: 'JFK', airline: 'Delta Air Lines',   flightNumber: 'DL 703', passengers: 33, costPerPerson: 290, currency: 'USD' });

    await expect(page.getByText('JFK → BOS')).toBeVisible();
    await expect(page.getByText('BOS → SFO')).toBeVisible();
    await expect(page.getByText('SFO → JFK')).toBeVisible();

    // ── 6. Buses – 2 (USD) ───────────────────────────────────────────────
    await addBus(page, { name: 'Charter Coach NYC', capacity: 45, costPerBus: 950, days: 4, quantity: 1, currency: 'USD' });
    await addBus(page, { name: 'SF City Shuttle',   capacity: 20, costPerBus: 700, days: 3, quantity: 1, currency: 'USD' });
    await expect(page.getByText('Charter Coach NYC')).toBeVisible();
    await expect(page.getByText('SF City Shuttle')).toBeVisible();

    // ── 7. Accommodation – 1 per city (USD) ─────────────────────────────
    await addAccommodation(page, { cityName: 'New York',      hotelName: 'The Manhattan Grand',  nights: 4, roomCostPerRoom: 350, currency: 'USD', breakfastIncluded: false });
    await addAccommodation(page, { cityName: 'Boston',        hotelName: 'Boston Harbor Hotel',  nights: 3, roomCostPerRoom: 280, currency: 'USD', breakfastIncluded: true  });
    await addAccommodation(page, { cityName: 'San Francisco', hotelName: 'Hotel Embarcadero SF', nights: 3, roomCostPerRoom: 320, currency: 'USD', breakfastIncluded: false });

    // ── 8. Meals (USD) ────────────────────────────────────────────────────
    await fillMeals(page, 0, { breakfastCost: 25, lunchCost: 40, dinnerCost: 65, currency: 'USD' }); // NY
    await fillMeals(page, 1, { breakfastCost:  0, lunchCost: 35, dinnerCost: 60, currency: 'USD' }); // Boston
    await fillMeals(page, 2, { breakfastCost: 20, lunchCost: 38, dinnerCost: 70, currency: 'USD' }); // SF

    // ── 9. Activities – 3 (USD) ──────────────────────────────────────────
    await addActivity(page, { name: 'Statue of Liberty Ferry', entryCost: 25, transportCost: 15, guideCost: 50, currency: 'USD' });
    await addActivity(page, { name: 'Freedom Trail Boston',    entryCost:  0, transportCost: 20, guideCost: 40, currency: 'USD' });
    await addActivity(page, { name: 'Golden Gate Bridge Tour', entryCost: 10, transportCost: 30, guideCost: 60, currency: 'USD' });

    // ── 10. Extras – Visa + Tips + Insurance ─────────────────────────────
    await expect(page.getByText('Visa (International Only)')).toBeVisible();
    await expect(page.getByText('Tips (International Only)')).toBeVisible();

    const extrasCard = page.locator('#section-extras');
    // Each extras block is a div.space-y-4; first number input = Cost Per Person
    await extrasCard.locator('div.space-y-4').filter({ hasText: 'Visa (International Only)' })
      .locator('input[type="number"]').first().fill('6500');
    await extrasCard.locator('div.space-y-4').filter({ hasText: 'Tips (International Only)' })
      .locator('input[type="number"]').first().fill('50');
    await extrasCard.locator('div.space-y-4').filter({ hasText: 'Insurance (Required for all trips)' })
      .locator('input[type="number"]').first().fill('800');

    // ── 11. Admin Charges – ₹10,00,000 ──────────────────────────────────
    const adminPanel = page.locator('#section-summary')
      .locator('div')
      .filter({ hasText: /^Admin Charges$/ })
      .locator('..')
      .first();
    await adminPanel.locator('input[type="number"]').first().fill('1000000');
    await page.waitForTimeout(S);

    // ── 12. Verify tax lines (international) ─────────────────────────────
    await expect(page.getByText(/TCS.*%.*on Subtotal/i)).toBeVisible();
    await expect(page.getByText(/TDS.*%.*deducted/i)).toBeHidden();
    await expect(page.getByText(/GST \(\d+%\)/)).toBeVisible();
    await expect(page.getByText('Grand Total')).toBeVisible();

    // ── 13. Submit ────────────────────────────────────────────────────────
    await page.getByRole('button', { name: /create trip/i }).click();
    await page.waitForURL(/\/trips\/(?!create)/, { timeout: 45_000 });
    await expect(page).not.toHaveURL(/\/trips\/create/);

    await expect(
      page.locator('[data-sonner-toaster]').getByText(/trip created|saved successfully/i)
    ).toBeVisible({ timeout: 12_000 });

    console.log('✅ Trip 2 (International/Commercial/Tour Planner) inserted →', page.url());
  });
});