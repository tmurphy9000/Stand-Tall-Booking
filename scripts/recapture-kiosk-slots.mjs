import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE_URL = 'https://www.standtallbooking.com';
const KIOSK_TOKEN = 'demo_kiosk_token_000000000000000';
const OUT = 'public/help-assets/screenshots/kiosk/kiosk-walk-in-slots.png';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  console.log('→ Loading kiosk landing…');
  await page.goto(`${BASE_URL}/checkin/${KIOSK_TOKEN}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  // Confirm landing is showing
  const landingText = await page.evaluate(() => document.body.innerText.slice(0, 120));
  console.log('  landing text:', landingText.replace(/\n/g, ' '));

  // Walk In button — substring match avoids the child-text concatenation issue
  const walkInBtn = page.locator('button').filter({ hasText: 'Walk In' }).first();
  const visible = await walkInBtn.isVisible({ timeout: 3000 }).catch(() => false);
  console.log(`  Walk In button visible: ${visible}`);
  if (!visible) {
    console.error('  ✗ Walk In button not found — aborting');
    await browser.close();
    process.exit(1);
  }

  await walkInBtn.click();
  await page.waitForTimeout(1200);

  // Fill wi_form
  const firstName = page.locator('input[placeholder="First name"]');
  if (!(await firstName.isVisible({ timeout: 3000 }).catch(() => false))) {
    console.error('  ✗ wi_form did not appear after clicking Walk In');
    await browser.close();
    process.exit(1);
  }
  await firstName.fill('Demo');
  await page.locator('input[placeholder="Last name"]').fill('Walkin');
  await page.locator('input[placeholder="Phone number"]').fill('5550000099');
  console.log('  filled wi_form');

  // Click Next — Choose a Service
  const nextBtn = page.locator('button').filter({ hasText: /next.*service/i }).first();
  await nextBtn.click();
  await page.waitForTimeout(3000); // services load from Supabase

  const servicesText = await page.evaluate(() => document.body.innerText.slice(0, 200));
  console.log('  after Next click:', servicesText.replace(/\n/g, ' ').slice(0, 150));

  // Select Haircut
  const haircut = page.locator('button').filter({ hasText: 'Haircut' }).first();
  if (await haircut.isVisible({ timeout: 3000 }).catch(() => false)) {
    await haircut.click();
    console.log('  clicked Haircut');
  } else {
    // Fallback: pick the first service button
    const firstSvc = page.locator('button').filter({ hasText: /\$/ }).first();
    if (await firstSvc.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstSvc.click();
      console.log('  clicked first available service (Haircut not found)');
    } else {
      console.log('  ⚠ no service button found — will screenshot whatever is showing');
    }
  }

  await page.waitForTimeout(3500); // slots load from Supabase

  const slotsText = await page.evaluate(() => document.body.innerText.slice(0, 400));
  console.log('  slots screen text:', slotsText.replace(/\n/g, ' ').slice(0, 300));

  // Count slot buttons (time patterns like "3:30 PM")
  let slotCount = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .filter(b => /\d:\d+\s*(AM|PM)/i.test(b.textContent)).length
  );
  console.log(`  slot buttons on wi_slots: ${slotCount}`);

  // If today has no slots (e.g. after hours), navigate into the "Book for a different day" flow.
  // fb_slots uses the same 2-column grid layout and is the correct illustration for the article.
  if (slotCount === 0) {
    console.log('  → no slots today; using "Book for a different day" flow for screenshot');

    const bookDiffDay = page.locator('button, a').filter({ hasText: /book for a different day/i }).first();
    if (await bookDiffDay.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bookDiffDay.click();
      await page.waitForTimeout(1500); // fb_barber screen

      const barberText = await page.evaluate(() => document.body.innerText.slice(0, 200));
      console.log('  fb_barber screen:', barberText.replace(/\n/g, ' ').slice(0, 120));

      // "No preference" shows all barbers' slots
      const noPref = page.locator('button').filter({ hasText: /no preference/i }).first();
      if (await noPref.isVisible({ timeout: 3000 }).catch(() => false)) {
        await noPref.click();
      } else {
        // Pick first barber listed
        await page.locator('button').nth(1).click();
      }
      await page.waitForTimeout(1500); // fb_date screen

      const dateText = await page.evaluate(() => document.body.innerText.slice(0, 200));
      console.log('  fb_date screen:', dateText.replace(/\n/g, ' ').slice(0, 120));

      // Click "Tomorrow" (second date option, first is Today)
      const tomorrow = page.locator('button').filter({ hasText: /tomorrow/i }).first();
      if (await tomorrow.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tomorrow.click();
      } else {
        // Fallback: pick the second date button
        const dateBtns = page.locator('button').filter({ hasText: /today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i });
        await dateBtns.nth(1).click();
      }
      await page.waitForTimeout(3500); // fb_slots load

      const fbText = await page.evaluate(() => document.body.innerText.slice(0, 400));
      console.log('  fb_slots screen:', fbText.replace(/\n/g, ' ').slice(0, 300));

      slotCount = await page.evaluate(() =>
        Array.from(document.querySelectorAll('button'))
          .filter(b => /\d:\d+\s*(AM|PM)/i.test(b.textContent)).length
      );
      console.log(`  slot buttons on fb_slots: ${slotCount}`);
    } else {
      console.log('  ⚠ "Book for a different day" button not found');
    }
  }

  await page.screenshot({ path: OUT, fullPage: false });
  console.log(`  ✓ saved ${OUT}`);

  await browser.close();
})();
