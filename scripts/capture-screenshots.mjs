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

  await browser.close();

  console.log(`
✅ Screenshots complete
   Location: ${OUT_DIR}

   calendar/
     calendar-day.png
     calendar-week.png
     new-booking-modal.png
     dashboard.png
   clients/
     client-list.png
     client-profile.png
   settings/
     settings.png
   checkout/
     checkout.png
`);
}

run().catch(err => {
  console.error('\n✗ Screenshot capture failed:', err.message);
  process.exit(1);
});
