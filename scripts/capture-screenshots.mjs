/**
 * capture-screenshots.mjs
 * Playwright script that logs into the demo shop and captures help-doc screenshots.
 *
 * Usage:
 *   npm run capture-screenshots
 *   (or: node scripts/capture-screenshots.mjs)
 *
 * Prerequisite: run `node scripts/seed-demo-shop.mjs` first to ensure demo data exists.
 *
 * Output: public/help-assets/screenshots/{category}/{name}.png
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const DEMO_EMAIL    = 'demo@standtallbooking.com';
const DEMO_PASSWORD = 'DemoShop2025!';
const BASE_URL      = 'http://localhost:5173';
const OUT_DIR       = join(ROOT, 'public', 'help-assets', 'screenshots');
const VIEWPORT      = { width: 1440, height: 900 };

// Wait longer for initial navigation, shorter for subsequent interactions
const NAV_WAIT = 2500;
const SETTLE   = 800;

function outPath(category, name) {
  const dir = join(OUT_DIR, category);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, `${name}.png`);
}

async function waitForPageLoad(page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(SETTLE);
  await page.waitForFunction(
    () => !document.querySelector('.animate-spin'),
    { timeout: 5000 }
  ).catch(() => {});
  // Force-hide setup checklist (belt-and-suspenders alongside addInitScript)
  await page.evaluate(() => {
    document.querySelectorAll('[style*="position: fixed"]').forEach(el => {
      if (
        el.textContent.includes('Finish setting up') ||
        el.textContent.includes('SHOP SETUP') ||
        el.querySelector('[aria-label="Minimize setup checklist"]')
      ) {
        el.style.setProperty('display', 'none', 'important');
      }
    });
  }).catch(() => {});
}

async function run() {
  console.log('— Stand Tall Booking: Screenshot Capture —\n');
  console.log(`Output dir: ${OUT_DIR}`);
  console.log(`Base URL  : ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2, // retina quality
  });

  // Auto-hide the setup checklist on every page load — hide parent element rather than
  // clicking minimize (clicking turns the panel into a top banner, still intrusive)
  await context.addInitScript(() => {
    const hideSetupOverlays = () => {
      // Hide floating panel (contains the minimize button)
      document.querySelectorAll('[aria-label="Minimize setup checklist"]').forEach(btn => {
        const panel = btn.closest('[style*="position: fixed"]');
        if (panel) panel.style.setProperty('display', 'none', 'important');
      });
      // Hide top banner (fixed bar containing "Finish setting up" or "SHOP SETUP")
      document.querySelectorAll('[style*="position: fixed"]').forEach(el => {
        if (
          el.textContent.includes('Finish setting up') ||
          el.textContent.includes('SHOP SETUP') ||
          el.querySelector('[aria-label="Minimize setup checklist"]')
        ) {
          el.style.setProperty('display', 'none', 'important');
        }
      });
    };
    const observer = new MutationObserver(hideSetupOverlays);
    observer.observe(document.body, { childList: true, subtree: true });
    [100, 500, 1000, 2500].forEach(t => setTimeout(hideSetupOverlays, t));
  });

  const page = await context.newPage();

  // ── 1. Login ──────────────────────────────────────────────────────────────
  console.log('→ Logging in...');
  await page.goto(`${BASE_URL}/barber-login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.fill('input[type="email"]', DEMO_EMAIL);
  await page.fill('input[type="password"]', DEMO_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for redirect to Calendar
  await page.waitForURL('**/Calendar', { timeout: 15000 });
  await waitForPageLoad(page);

  console.log('✓ Logged in\n');

  // ── 2. Calendar — Day View ────────────────────────────────────────────────
  console.log('→ Calendar: day view');
  // Already on Calendar; ensure day mode is active (it's the default)
  // Click "day" toggle button if week is currently shown
  const dayBtn = page.locator('button', { hasText: /^day$/i });
  if (await dayBtn.isVisible()) {
    await dayBtn.click();
    await page.waitForTimeout(SETTLE);
  }
  await waitForPageLoad(page);
  await page.screenshot({ path: outPath('calendar', 'calendar-day'), fullPage: false });
  console.log('  ✓ calendar-day.png');

  // ── 3. Calendar — Week View ───────────────────────────────────────────────
  console.log('→ Calendar: week view');
  const weekBtn = page.locator('button', { hasText: /^week$/i });
  if (await weekBtn.isVisible()) {
    await weekBtn.click();
    await page.waitForTimeout(NAV_WAIT);
    await waitForPageLoad(page);
  }
  await page.screenshot({ path: outPath('calendar', 'calendar-week'), fullPage: false });
  console.log('  ✓ calendar-week.png');

  // ── 4. New Booking Modal ──────────────────────────────────────────────────
  console.log('→ New Booking modal');
  // Switch back to day view so the modal has context
  if (await dayBtn.isVisible()) {
    await dayBtn.click();
    await page.waitForTimeout(SETTLE);
  }
  // Dismiss any "Continue →" overlay that might be blocking
  const continueBtn = page.locator('button').filter({ hasText: /continue/i }).first();
  if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await continueBtn.click();
    await page.waitForTimeout(400);
  }

  // Click the "+ Book" button in the calendar header
  const newBookingBtn = page.locator('button').filter({ hasText: /^book$/i }).first();
  if (await newBookingBtn.isVisible()) {
    await newBookingBtn.click({ force: true });
    await page.waitForTimeout(NAV_WAIT);
    // Wait for modal to be visible
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(SETTLE);
    await page.screenshot({ path: outPath('calendar', 'new-booking-modal'), fullPage: false });
    console.log('  ✓ new-booking-modal.png');
    // Close modal
    const closeBtn = page.locator('[role="dialog"] button').filter({ hasText: /cancel|close/i }).first();
    if (await closeBtn.isVisible()) await closeBtn.click();
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(SETTLE);
  } else {
    console.log('  ⚠ New booking button not found, skipping');
  }

  // ── 5. Client List ────────────────────────────────────────────────────────
  console.log('→ Client list');
  await page.goto(`${BASE_URL}/ClientList`, { waitUntil: 'domcontentloaded' });
  await waitForPageLoad(page);
  await page.screenshot({ path: outPath('clients', 'client-list'), fullPage: false });
  console.log('  ✓ client-list.png');

  // ── 6. Client Profile ─────────────────────────────────────────────────────
  console.log('→ Client profile');
  // Click the first client row to open their profile
  const clientRow = page.locator('a[href*="ClientDetails"], [data-client-row], table tbody tr').first();
  if (await clientRow.isVisible()) {
    await clientRow.click();
    await page.waitForURL('**/ClientDetails**', { timeout: 8000 }).catch(() => {});
    await waitForPageLoad(page);
  } else {
    // Fallback: find any link to ClientDetails in the page
    const detailLink = page.locator('a[href*="ClientDetails"]').first();
    if (await detailLink.isVisible()) {
      await detailLink.click();
      await waitForPageLoad(page);
    }
  }
  await page.screenshot({ path: outPath('clients', 'client-profile'), fullPage: false });
  console.log('  ✓ client-profile.png');

  // ── 6b. Import Clients dialog ─────────────────────────────────────────────
  console.log('→ Import Clients dialog');
  await page.goto(`${BASE_URL}/ClientList`, { waitUntil: 'domcontentloaded' });
  await waitForPageLoad(page);
  {
    // The header Import button is the topmost one (y < 100); the onboarding
    // checklist also has an "Import your existing clients" item further down.
    const importBtns = await page.locator('button').filter({ hasText: 'Import' }).all();
    let topBtn = null, minY = Infinity;
    for (const btn of importBtns) {
      const box = await btn.boundingBox();
      if (box && box.y < minY) { minY = box.y; topBtn = btn; }
    }
    if (topBtn) {
      await topBtn.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(SETTLE);
      await page.screenshot({ path: outPath('clients', 'import-dialog'), fullPage: false });
      console.log('  ✓ import-dialog.png');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(SETTLE);
    } else {
      console.log('  ⚠ Import button not found, skipping');
    }
  }

  // ── 7. Settings ───────────────────────────────────────────────────────────
  console.log('→ Settings');
  await page.goto(`${BASE_URL}/Settings`, { waitUntil: 'domcontentloaded' });
  await waitForPageLoad(page);
  await page.screenshot({ path: outPath('settings', 'settings'), fullPage: false });
  console.log('  ✓ settings.png');

  // ── 8. Checkout (QuickCheckout page) ─────────────────────────────────────
  console.log('→ Checkout');
  await page.goto(`${BASE_URL}/QuickCheckout`, { waitUntil: 'domcontentloaded' });
  await waitForPageLoad(page);
  await page.screenshot({ path: outPath('checkout', 'checkout'), fullPage: false });
  console.log('  ✓ checkout.png');

  // ── 9. Dashboard ──────────────────────────────────────────────────────────
  console.log('→ Dashboard');
  await page.goto(`${BASE_URL}/AdminDashboard`, { waitUntil: 'domcontentloaded' });
  await waitForPageLoad(page);
  await page.screenshot({ path: outPath('calendar', 'dashboard'), fullPage: false });
  console.log('  ✓ dashboard.png');

  // ── 10. Outside-hours warning dialog ─────────────────────────────────────
  console.log('→ Outside-hours warning dialog');
  await page.goto(`${BASE_URL}/Calendar`, { waitUntil: 'domcontentloaded' });
  await waitForPageLoad(page);
  // Switch to day view
  const dayBtn2 = page.locator('button').filter({ hasText: /^day$/i }).first();
  if (await dayBtn2.isVisible()) { await dayBtn2.click(); await page.waitForTimeout(SETTLE); }
  // Open New Booking modal
  const bookBtn2 = page.locator('button').filter({ hasText: /^book$/i }).first();
  if (await bookBtn2.isVisible()) {
    await bookBtn2.click({ force: true });
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(SETTLE);
    // Select the first barber
    const barberTrigger = page.locator('[role="dialog"] button[role="combobox"]').first();
    if (await barberTrigger.isVisible()) {
      await barberTrigger.click();
      await page.waitForTimeout(300);
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible()) { await firstOption.click(); await page.waitForTimeout(300); }
    }
    // Select the first service
    const serviceTrigger = page.locator('[role="dialog"] button[role="combobox"]').nth(1);
    if (await serviceTrigger.isVisible()) {
      await serviceTrigger.click();
      await page.waitForTimeout(300);
      const serviceOption = page.locator('[role="option"]').first();
      if (await serviceOption.isVisible()) { await serviceOption.click(); await page.waitForTimeout(500); }
    }
    // Click an outside-hours slot (dashed border)
    const outsideSlot = page.locator('[role="dialog"] button.border-dashed').first();
    if (await outsideSlot.isVisible({ timeout: 3000 }).catch(() => false)) {
      await outsideSlot.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: outPath('calendar', 'outside-hours-warning'), fullPage: false });
      console.log('  ✓ outside-hours-warning.png');
      // Dismiss
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      await page.keyboard.press('Escape');
    } else {
      console.log('  ⚠ No outside-hours slot found, skipping');
    }
    await page.waitForTimeout(SETTLE);
  }

  // ── 11. Block Time modal ──────────────────────────────────────────────────
  console.log('→ Block Time modal');
  await page.goto(`${BASE_URL}/Calendar`, { waitUntil: 'domcontentloaded' });
  await waitForPageLoad(page);
  if (await dayBtn2.isVisible()) { await dayBtn2.click(); await page.waitForTimeout(SETTLE); }
  // Click a bookable slot (calendar-slot divs with cursor-pointer = bookable)
  // Try clicking at a mid-morning time position in the grid
  const slotOpened = await page.evaluate(async () => {
    const slots = document.querySelectorAll('.calendar-slot');
    for (const slot of slots) {
      if (slot.classList.contains('cursor-pointer')) {
        slot.click();
        return true;
      }
    }
    return false;
  });
  await page.waitForTimeout(600);
  if (slotOpened) {
    const blockBtn = page.locator('button, div[role="menuitem"]').filter({ hasText: /block time/i }).first();
    if (await blockBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await blockBtn.click({ force: true });
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(SETTLE);
      await page.screenshot({ path: outPath('calendar', 'block-time-modal'), fullPage: false });
      console.log('  ✓ block-time-modal.png');
      await page.keyboard.press('Escape');
    } else {
      // Slot menu might say "Block Time" in a plain button
      const blockBtnAny = page.locator('button').filter({ hasText: /block/i }).first();
      if (await blockBtnAny.isVisible({ timeout: 2000 }).catch(() => false)) {
        await blockBtnAny.click({ force: true });
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(SETTLE);
        await page.screenshot({ path: outPath('calendar', 'block-time-modal'), fullPage: false });
        console.log('  ✓ block-time-modal.png');
        await page.keyboard.press('Escape');
      } else {
        console.log('  ⚠ Block Time button not found, skipping');
      }
    }
  } else {
    console.log('  ⚠ No bookable slot found for block-time screenshot, skipping');
  }

  // ── 12. Call-Off settings ─────────────────────────────────────────────────
  console.log('→ Call-Off settings');
  await page.goto(`${BASE_URL}/Settings?tab=calloff`, { waitUntil: 'domcontentloaded' });
  await waitForPageLoad(page);
  await page.screenshot({ path: outPath('settings', 'calloff'), fullPage: false });
  console.log('  ✓ calloff.png');

  // ── 13. Client booking confirmation — "Add to Calendar" buttons ───────────
  // Navigates to the public booking page and uses React fiber dispatch to jump
  // directly to the SuccessStep (step 8) with real barber data + a plausible
  // service, avoiding OTP and without creating a real appointment record.
  console.log('→ Add to Calendar (booking confirmation screen)');
  await page.goto(`${BASE_URL}/book/demo-barbershop`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(4000); // Let Supabase data fully load

  await page.evaluate(() => {
    const rootEl = document.getElementById('root');
    const containerKey = Object.keys(rootEl).find(k => k.startsWith('__reactContainer'));
    const containerFiber = rootEl[containerKey];

    function walkFiber(fiber, depth = 0) {
      if (!fiber || depth > 50) return null;
      if (fiber.type?.name === 'ClientBooking') return fiber;
      const fromChild = walkFiber(fiber.child, depth + 1);
      if (fromChild) return fromChild;
      return walkFiber(fiber.sibling, depth + 1);
    }

    const cbFiber = walkFiber(containerFiber);
    if (!cbFiber) return;

    function getHook(n) {
      let h = cbFiber.memoizedState;
      for (let i = 0; i < n; i++) { if (!h?.next) return null; h = h.next; }
      return h;
    }

    const barbers = getHook(12)?.memoizedState;
    const firstBarber = Array.isArray(barbers) && barbers[0];
    if (!firstBarber) return;

    const services = getHook(13)?.memoizedState;
    const firstService = Array.isArray(services) && services[0]
      ? services[0]
      : { name: "Haircut", id: "mock", duration: 30 };

    // Dispatch state: barber (26), service (27), date (28), time (29), clientName (30), step (7)
    getHook(26)?.queue?.dispatch?.(firstBarber);
    getHook(27)?.queue?.dispatch?.(firstService);
    getHook(28)?.queue?.dispatch?.("2026-07-14");
    getHook(29)?.queue?.dispatch?.("10:00");
    getHook(30)?.queue?.dispatch?.("Alex Johnson");
    getHook(7)?.queue?.dispatch?.(8);
  });

  await page.waitForTimeout(1500);
  const addCalBtn = page.locator('a').filter({ hasText: /add to google calendar/i }).first();
  if (await addCalBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.screenshot({ path: outPath('booking', 'add-to-calendar'), fullPage: false });
    console.log('  ✓ add-to-calendar.png');
  } else {
    console.log('  ⚠ Add to Calendar screen not reached, skipping');
  }

  // ── Helper: dispatch fiber state on the booking page ─────────────────────
  async function dispatchBookingState(pg, patches) {
    await pg.evaluate((patchMap) => {
      const rootEl = document.getElementById('root');
      const containerKey = Object.keys(rootEl).find(k => k.startsWith('__reactContainer'));
      const containerFiber = rootEl[containerKey];

      function walkFiber(fiber, depth = 0) {
        if (!fiber || depth > 60) return null;
        if (fiber.type?.name === 'ClientBooking') return fiber;
        const fromChild = walkFiber(fiber.child, depth + 1);
        if (fromChild) return fromChild;
        return walkFiber(fiber.sibling, depth + 1);
      }

      const cbFiber = walkFiber(containerFiber);
      if (!cbFiber) return;

      function getHook(n) {
        let h = cbFiber.memoizedState;
        for (let i = 0; i < n; i++) { if (!h?.next) return null; h = h.next; }
        return h;
      }

      const barbers = getHook(12)?.memoizedState;
      const firstBarber = Array.isArray(barbers) && barbers[0];
      const services = getHook(13)?.memoizedState;
      const firstService = (Array.isArray(services) && services[0])
        ? services[0]
        : { id: 'mock', name: 'Haircut', duration: 30, price: 35 };

      if (patchMap.barber && firstBarber) getHook(26)?.queue?.dispatch?.(firstBarber);
      if (patchMap.service) getHook(27)?.queue?.dispatch?.(firstService);
      if (patchMap.step !== undefined) getHook(7)?.queue?.dispatch?.(patchMap.step);
      if (patchMap.identityPhase) getHook(42)?.queue?.dispatch?.(patchMap.identityPhase);
      if (patchMap.otpSentPhone) getHook(46)?.queue?.dispatch?.(patchMap.otpSentPhone);
      if (patchMap.myAppts !== undefined) getHook(21)?.queue?.dispatch?.(patchMap.myAppts);
      if (patchMap.clientFirstName) getHook(43)?.queue?.dispatch?.(patchMap.clientFirstName);
    }, patches);
    await pg.waitForTimeout(1500);
  }

  // ── 14. Service selection (Step 2 of 5) ──────────────────────────────────
  console.log('→ Service selection (booking page)');
  await page.goto(`${BASE_URL}/book/demo-barbershop`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(4000);
  await dispatchBookingState(page, { barber: true, identityPhase: 'session', step: 2 });
  {
    const serviceCards = page.locator('button').filter({ hasText: /haircut|fade|trim|beard/i }).first();
    if (await serviceCards.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.screenshot({ path: outPath('booking', 'service-selection'), fullPage: false });
      console.log('  ✓ service-selection.png');
    } else {
      // Step may be off by 1 — try step index 2 again, or check actual content
      const stepHeading = page.locator('h2, h3').filter({ hasText: /service|step 2/i }).first();
      if (await stepHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.screenshot({ path: outPath('booking', 'service-selection'), fullPage: false });
        console.log('  ✓ service-selection.png');
      } else {
        console.log('  ⚠ Service selection step not visible, skipping');
      }
    }
  }

  // ── 15. Time slot picker (Step 3 of 5) ───────────────────────────────────
  // Goal: show the date strip with a date selected and time slots loaded.
  // Strategy: dispatch to step 5, click the 3rd available date (a few days
  // out to avoid today's limited slots), wait for time slot buttons to appear.
  console.log('→ Time slot picker (booking page)');
  await page.goto(`${BASE_URL}/book/demo-barbershop`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(4000);
  await dispatchBookingState(page, { barber: true, service: true, identityPhase: 'session', step: 5 });
  {
    // Date buttons have the class pattern: flex-shrink-0 flex flex-col items-center
    // Find all enabled date buttons and click the 3rd one (0-indexed: skip today+tomorrow)
    const dateBtns = page.locator('button.flex-shrink-0').filter({ hasNot: page.locator('[disabled]') });
    const count = await dateBtns.count().catch(() => 0);
    if (count >= 3) {
      const targetDate = dateBtns.nth(2); // 3rd enabled date = a few days out
      const dateText = await targetDate.textContent().catch(() => '');
      console.log(`  clicking date: ${dateText.trim()}`);
      await targetDate.click();
      // Wait for time slot buttons (contain AM/PM) to appear
      await page.waitForFunction(
        () => document.querySelectorAll('button').length > 5 &&
              Array.from(document.querySelectorAll('button')).some(b => /\d+:\d+\s*(AM|PM)/i.test(b.textContent)),
        { timeout: 8000 }
      ).catch(() => {});
      await page.waitForTimeout(800);
    } else {
      console.log(`  ⚠ Only ${count} date buttons found, proceeding without date selection`);
    }
    await page.screenshot({ path: outPath('booking', 'time-slot-picker'), fullPage: false });
    console.log('  ✓ time-slot-picker.png');
  }

  // ── 16. OTP verification screen ───────────────────────────────────────────
  console.log('→ OTP verification (booking page)');
  await page.goto(`${BASE_URL}/book/demo-barbershop`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(4000);
  await dispatchBookingState(page, {
    identityPhase: 'ft_otp',
    otpSentPhone: '(555) 867-5309',
    step: 0,
  });
  {
    const otpHeading = page.locator('h2, h3, p').filter({ hasText: /check your text|verify|6-digit|code/i }).first();
    if (await otpHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.screenshot({ path: outPath('booking', 'otp-verification'), fullPage: false });
      console.log('  ✓ otp-verification.png');
    } else {
      console.log('  ⚠ OTP verification screen not visible, skipping');
    }
  }

  // ── 17. Client portal (appointment list) ─────────────────────────────────
  console.log('→ Client portal — appointment list (booking page)');
  await page.goto(`${BASE_URL}/book/demo-barbershop`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(4000);
  await dispatchBookingState(page, {
    identityPhase: 'session',
    clientFirstName: 'Alex',
    myAppts: 'list',
    step: 0,
  });
  {
    const apptHeading = page.locator('h2, h3').filter({ hasText: /appointment|upcoming|booking/i }).first();
    if (await apptHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.screenshot({ path: outPath('booking', 'client-portal'), fullPage: false });
      console.log('  ✓ client-portal.png');
    } else {
      console.log('  ⚠ Client portal list not visible, skipping');
    }
  }

  // ── 18. Booking confirmation / success screen ────────────────────────────
  // Same SuccessStep (step 8) as add-to-calendar.png but named for the
  // booking-flow article where context is the completion of the booking.
  console.log('→ Booking confirmation screen (You\'re booked!)');
  await page.goto(`${BASE_URL}/book/demo-barbershop`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(4000);
  await page.evaluate(() => {
    const rootEl = document.getElementById('root');
    const containerKey = Object.keys(rootEl).find(k => k.startsWith('__reactContainer'));
    const containerFiber = rootEl[containerKey];

    function walkFiber(fiber, depth = 0) {
      if (!fiber || depth > 60) return null;
      if (fiber.type?.name === 'ClientBooking') return fiber;
      const fromChild = walkFiber(fiber.child, depth + 1);
      if (fromChild) return fromChild;
      return walkFiber(fiber.sibling, depth + 1);
    }

    const cbFiber = walkFiber(containerFiber);
    if (!cbFiber) return;

    function getHook(n) {
      let h = cbFiber.memoizedState;
      for (let i = 0; i < n; i++) { if (!h?.next) return null; h = h.next; }
      return h;
    }

    const barbers = getHook(12)?.memoizedState;
    const firstBarber = Array.isArray(barbers) && barbers[0];
    const services = getHook(13)?.memoizedState;
    const firstService = (Array.isArray(services) && services[0])
      ? services[0]
      : { name: 'Haircut', id: 'mock', duration: 30, price: 35 };

    if (firstBarber) {
      getHook(26)?.queue?.dispatch?.(firstBarber);
      getHook(27)?.queue?.dispatch?.(firstService);
      getHook(28)?.queue?.dispatch?.('2026-07-14');
      getHook(29)?.queue?.dispatch?.('10:00');
      getHook(30)?.queue?.dispatch?.('Alex Johnson');
      getHook(7)?.queue?.dispatch?.(8);
    }
  });
  await page.waitForTimeout(1500);
  {
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.toLowerCase().includes("you're booked") || bodyText.toLowerCase().includes('booking summary')) {
      await page.screenshot({ path: outPath('booking', 'booking-confirmation'), fullPage: false });
      console.log('  ✓ booking-confirmation.png');
    } else {
      console.log('  ⚠ Booking confirmation screen not visible, skipping');
    }
  }

  // ── 19. Settings → Kiosk tab ─────────────────────────────────────────
  console.log('→ Settings: Kiosk tab');
  await page.goto(`${BASE_URL}/Settings?tab=kiosk`, { waitUntil: 'domcontentloaded' });
  await waitForPageLoad(page);
  await page.screenshot({ path: outPath('kiosk', 'settings-kiosk'), fullPage: false });
  console.log('  ✓ settings-kiosk.png');

  // ── 20. Kiosk landing page (Check In + Walk In buttons) ──────────────
  // Demo shop kiosk token is known; walk_in_enabled=true so both buttons show.
  console.log('→ Kiosk landing (Check In + Walk In)');
  const KIOSK_TOKEN = 'demo_kiosk_token_000000000000000';
  await page.goto(`${BASE_URL}/checkin/${KIOSK_TOKEN}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: outPath('kiosk', 'kiosk-landing'), fullPage: false });
  console.log('  ✓ kiosk-landing.png');

  // ── 21. Kiosk walk-in slots screen ───────────────────────────────────
  // Navigate through: Walk In → fill form → Choose a Service → slots
  // Also clicks a slot to create a walk-in booking (used by step 22 for
  // the WALK-IN badge on the calendar). Booking is cleaned up after step 22.
  console.log('→ Kiosk walk-in slots screen');
  await page.goto(`${BASE_URL}/checkin/${KIOSK_TOKEN}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2500);
  {
    // Walk In button text is "Walk InBook a spot right now" (concatenated child text);
    // use substring match (no anchors) to locate it.
    const walkInBtn = page.locator('button').filter({ hasText: 'Walk In' }).first();
    if (await walkInBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await walkInBtn.click();
      await page.waitForTimeout(1000);

      const firstInput = page.locator('input[placeholder="First name"]');
      if (await firstInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstInput.fill('Demo');
        await page.locator('input[placeholder="Last name"]').fill('Walkin');
        await page.locator('input[placeholder="Phone number"]').fill('5550000099');
        await page.locator('button').filter({ hasText: /next.*service/i }).first().click();
        await page.waitForTimeout(2500);

        // Select Haircut service
        const haircut = page.locator('button').filter({ hasText: 'Haircut' }).first();
        if (await haircut.isVisible({ timeout: 3000 }).catch(() => false)) {
          await haircut.click();
          await page.waitForTimeout(3000);
        }
      }
    }
    // Take screenshot of slots screen (shows available times grid)
    await page.screenshot({ path: outPath('kiosk', 'kiosk-walk-in-slots'), fullPage: false });
    console.log('  ✓ kiosk-walk-in-slots.png');

    // Click the first available slot to create a walk-in booking for step 22
    const slotBtns = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .filter(b => /\d:\d+\s*(AM|PM)/i.test(b.textContent))
        .map(b => b.textContent.trim().slice(0, 20))
    );
    if (slotBtns.length > 0) {
      const firstSlot = page.locator('button').filter({ hasText: /\d:\d+\s*(AM|PM)/i }).first();
      await firstSlot.click();
      await page.waitForTimeout(4000);
      console.log(`  clicked slot — booking created for calendar badge screenshot`);
    } else {
      console.log('  ⚠ No slots today — calendar badge step may not show badge');
    }
  }

  // ── 22. Calendar with WALK-IN badge ──────────────────────────────────
  // The walk-in booking created in step 21 now appears on the admin calendar.
  // After screenshotting, delete the booking via the browser's auth session.
  console.log('→ Calendar: WALK-IN badge');
  {
    // Navigate back to admin calendar (page context is still logged in)
    await page.goto(`${BASE_URL}/Calendar`, { waitUntil: 'domcontentloaded' });
    await waitForPageLoad(page);
    const dayBtn3 = page.locator('button').filter({ hasText: /^day$/i }).first();
    if (await dayBtn3.isVisible()) { await dayBtn3.click(); await page.waitForTimeout(800); }
    await waitForPageLoad(page);

    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('span')).some(s => s.textContent.trim() === 'WALK-IN'),
      { timeout: 8000 }
    ).catch(() => {});
    await page.waitForTimeout(500);

    const hasBadge = await page.evaluate(
      () => Array.from(document.querySelectorAll('span')).some(s => s.textContent.trim() === 'WALK-IN')
    );
    await page.screenshot({ path: outPath('kiosk', 'calendar-walk-in-badge'), fullPage: false });
    console.log(`  ✓ calendar-walk-in-badge.png (WALK-IN badge ${hasBadge ? 'confirmed' : 'not detected'})`);

    // Clean up the walk-in booking using the browser's authenticated Supabase session
    const todayStr = new Date().toISOString().slice(0, 10);
    await page.evaluate(async (today) => {
      // Access the Supabase client already bootstrapped in the React app
      const supabaseUrl = 'https://mmmkachplbkaxvhauhaa.supabase.co';
      const anonKey = document.querySelector('meta[name="supabase-anon-key"]')?.content ?? '';
      // Try using the global supabase instance via window if exposed, else skip
    }, todayStr);
    // Since direct cleanup via page.evaluate is complex, remove by client_phone
    // using a separate fetch with the session token from localStorage
    const sessionToken = await page.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.includes('supabase') && key?.includes('auth')) {
          try {
            const val = JSON.parse(localStorage.getItem(key) ?? '');
            return val?.access_token ?? val?.currentSession?.access_token ?? null;
          } catch { return null; }
        }
      }
      return null;
    });
    if (sessionToken) {
      const delRes = await fetch(
        `https://mmmkachplbkaxvhauhaa.supabase.co/rest/v1/bookings?client_phone=eq.5550000099&date=eq.${todayStr}`,
        { method: 'DELETE', headers: { 'apikey': 'sb_publishable_6rnHHmGfI2RLTAFhAG_e3A_gXIw5Bov', 'Authorization': `Bearer ${sessionToken}` } }
      );
      console.log(`  cleaned up walk-in booking (${delRes.status})`);
    } else {
      console.log('  ⚠ No session token found — walk-in booking remains as demo data');
    }
  }

  // ── 23. Transactions page ─────────────────────────────────────────────────
  console.log('→ Transactions page');
  await page.goto(`${BASE_URL}/Transactions`, { waitUntil: 'domcontentloaded' });
  await waitForPageLoad(page);
  await page.screenshot({ path: outPath('checkout', 'transactions'), fullPage: false });
  console.log('  ✓ transactions.png');

  // ── 24. Refund dialog (only appears on Stripe card transactions) ──────────
  // Widen the date range to 2026-01-01 → today so historical card bookings
  // (including the one backfilled by the demo payments seed migration) are visible.
  console.log('→ Refund dialog');
  {
    const startInputs = await page.locator('input[type="date"]').all();
    if (startInputs.length >= 2) {
      await startInputs[0].fill('2026-01-01');
      await startInputs[0].dispatchEvent('change');
      await page.waitForTimeout(NAV_WAIT);
      await waitForPageLoad(page);
    }
    const refundBtn = page.locator('button').filter({ hasText: /^Refund$/i }).first();
    if (await refundBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await refundBtn.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(SETTLE);
      await page.screenshot({ path: outPath('checkout', 'refund-dialog'), fullPage: false });
      console.log('  ✓ refund-dialog.png');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(SETTLE);
    } else {
      console.log('  ⚠ No Refund button visible even with widened date range; skipping refund-dialog.png');
    }
  }

  // ── 25. Cash Drawer Log (scroll to bottom of Transactions page) ───────────
  console.log('→ Cash Drawer Log section');
  await page.goto(`${BASE_URL}/Transactions`, { waitUntil: 'domcontentloaded' });
  await waitForPageLoad(page);
  {
    // Scroll to Cash Drawer Log heading
    await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('h1, h2, h3, [class*="CardTitle"]'));
      const cashLog = els.find(el => el.textContent?.includes('Cash Drawer Log'));
      if (cashLog) cashLog.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await page.waitForTimeout(SETTLE);
    await page.screenshot({ path: outPath('checkout', 'cash-drawer-log'), fullPage: false });
    console.log('  ✓ cash-drawer-log.png');
  }

  // ── 26. Deposit settings (Settings → Payments) ────────────────────────────
  console.log('→ Deposit settings');
  await page.goto(`${BASE_URL}/Settings?tab=payments`, { waitUntil: 'domcontentloaded' });
  await waitForPageLoad(page);
  await page.screenshot({ path: outPath('checkout', 'deposit-settings'), fullPage: false });
  console.log('  ✓ deposit-settings.png');

  await browser.close();

  console.log(`
✅ Screenshots complete
   Location: ${OUT_DIR}

   calendar/
     calendar-day.png
     calendar-week.png
     new-booking-modal.png
     dashboard.png
     outside-hours-warning.png
     block-time-modal.png
   clients/
     client-list.png
     client-profile.png
     import-dialog.png
   settings/
     settings.png
     calloff.png
   kiosk/
     settings-kiosk.png
     kiosk-landing.png
     kiosk-walk-in-slots.png
     calendar-walk-in-badge.png
   booking/
     add-to-calendar.png
     service-selection.png
     time-slot-picker.png
     otp-verification.png
     client-portal.png
     booking-confirmation.png
   checkout/
     checkout.png
     transactions.png
     refund-dialog.png (skipped if no Stripe card transactions in demo shop)
     cash-drawer-log.png
     deposit-settings.png
`);
}

run().catch(err => {
  console.error('\n✗ Screenshot capture failed:', err.message);
  process.exit(1);
});
