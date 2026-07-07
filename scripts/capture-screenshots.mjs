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
  console.log('→ Time slot picker (booking page)');
  await page.goto(`${BASE_URL}/book/demo-barbershop`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(4000);
  await dispatchBookingState(page, { barber: true, service: true, identityPhase: 'session', step: 5 });
  {
    // DateTimeStep renders a date strip and "Next Available" button when barber+service are set
    const dateStrip = page.locator('button, div').filter({ hasText: /next available/i }).first();
    if (await dateStrip.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.screenshot({ path: outPath('booking', 'time-slot-picker'), fullPage: false });
      console.log('  ✓ time-slot-picker.png');
    } else {
      const stepHeading = page.locator('h2, h3, p').filter({ hasText: /step 3|pick a date|choose.*time/i }).first();
      if (await stepHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.screenshot({ path: outPath('booking', 'time-slot-picker'), fullPage: false });
        console.log('  ✓ time-slot-picker.png');
      } else {
        // Fallback: just take a screenshot of whatever is showing
        await page.screenshot({ path: outPath('booking', 'time-slot-picker'), fullPage: false });
        console.log('  ✓ time-slot-picker.png (fallback)');
      }
    }
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

  await browser.close();

  console.log(`
✅ Screenshots complete
   Location: ${OUT_DIR}

   calendar/
     calendar-day.png
     calendar-week.png
     new-booking-modal.png
     dashboard.png
     outside-hours-warning.png  [NEW]
     block-time-modal.png       [NEW]
   clients/
     client-list.png
     client-profile.png
   settings/
     settings.png
     calloff.png                [NEW]
   booking/
     add-to-calendar.png        [NEW]
     service-selection.png      [NEW]
     time-slot-picker.png       [NEW]
     otp-verification.png       [NEW]
     client-portal.png          [NEW]
   checkout/
     checkout.png
`);
}

run().catch(err => {
  console.error('\n✗ Screenshot capture failed:', err.message);
  process.exit(1);
});
