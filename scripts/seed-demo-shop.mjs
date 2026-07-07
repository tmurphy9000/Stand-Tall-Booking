/**
 * seed-demo-shop.mjs
 * Creates a self-contained demo shop with fake data for help-doc screenshots.
 * Safe to re-run — idempotent (skips already-created data).
 *
 * Usage: node scripts/seed-demo-shop.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { format, addDays, subDays } from 'date-fns';

const SUPABASE_URL = 'https://mmmkachplbkaxvhauhaa.supabase.co';
const SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tbWthY2hwbGJrYXh2aGF1aGFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjU4MTQ5MSwiZXhwIjoyMDkyMTU3NDkxfQ.shDouG_VAtSFmM9jZrr7RARIP9ovgZ38MKQkBdxDrpM';

export const DEMO_EMAIL    = 'demo@standtallbooking.com';
export const DEMO_PASSWORD = 'DemoShop2025!';
const DEMO_SHOP_NAME = 'The Demo Barbershop';
const DEMO_SHOP_SLUG = 'demo-barbershop';

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const today = format(new Date(), 'yyyy-MM-dd');

const BARBER_HOURS = {
  monday:    { start: '09:00', end: '18:00', off: false },
  tuesday:   { start: '09:00', end: '18:00', off: false },
  wednesday: { start: '09:00', end: '18:00', off: false },
  thursday:  { start: '09:00', end: '18:00', off: false },
  friday:    { start: '09:00', end: '20:00', off: false },
  saturday:  { start: '10:00', end: '17:00', off: false },
  sunday:    { start: '00:00', end: '00:00', off: true  },
};

function addMinString(time, mins) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// Returns a work date offset days from today, skipping Sundays
function workday(offset) {
  let d = new Date();
  if (offset === 0) return format(d, 'yyyy-MM-dd');
  const step = offset > 0 ? 1 : -1;
  let count = Math.abs(offset);
  while (count > 0) {
    d = addDays(d, step);
    if (d.getDay() !== 0) count--;
  }
  return format(d, 'yyyy-MM-dd');
}

async function run() {
  console.log('— Stand Tall Booking: Demo Shop Seeder —\n');

  // ── 1. Auth user ─────────────────────────────────────────────────────────
  let demoUserId;
  const { data: userList } = await sb.auth.admin.listUsers({ perPage: 200 });
  const existingUser = userList?.users?.find(u => u.email === DEMO_EMAIL);

  if (existingUser) {
    demoUserId = existingUser.id;
    console.log(`✓ Auth user exists: ${DEMO_EMAIL} (${demoUserId})`);
  } else {
    const { data: newUser, error: ue } = await sb.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Marcus Johnson', role: 'owner' },
    });
    if (ue) { console.error('Auth user create failed:', ue.message); process.exit(1); }
    demoUserId = newUser.user.id;
    console.log(`✓ Created auth user: ${DEMO_EMAIL} (${demoUserId})`);
  }

  // ── 2. Shops record (parent table) ───────────────────────────────────────
  const { data: existingShopRow } = await sb
    .from('shops')
    .select('id, name')
    .eq('url_slug', DEMO_SHOP_SLUG)
    .maybeSingle();

  let shopId;
  if (existingShopRow) {
    shopId = existingShopRow.id;
    console.log(`✓ Shops row exists: "${existingShopRow.name}" (${shopId})`);
  } else {
    const { data: newShop, error: she } = await sb
      .from('shops')
      .insert({
        name: DEMO_SHOP_NAME,
        url_slug: DEMO_SHOP_SLUG,
        business_email: DEMO_EMAIL,
        business_phone: '5550123456',
        onboarding_meta: {},
      })
      .select('id')
      .single();
    if (she) { console.error('shops insert failed:', she.message); process.exit(1); }
    shopId = newShop.id;
    console.log(`✓ Created shops row: "${DEMO_SHOP_NAME}" (${shopId})`);
  }

  // ── 3. Shop settings ─────────────────────────────────────────────────────
  const { data: existingSettings } = await sb
    .from('shop_settings')
    .select('id')
    .eq('shop_id', shopId)
    .maybeSingle();

  if (existingSettings) {
    console.log(`✓ Shop settings exist (${existingSettings.id})`);
  } else {
    const { error: sse } = await sb.from('shop_settings').insert({
      shop_id: shopId,
      shop_name: DEMO_SHOP_NAME,
      shop_email: DEMO_EMAIL,
      shop_phone: '(555) 012-3456',
      shop_address: '123 Main Street, Anytown, ST 00000',
      operating_hours: BARBER_HOURS,
      min_booking_notice_minutes: 30,
      max_booking_days_ahead: 30,
      default_tax_rate: 0,
      default_service_tax_rate: 0,
      cancellation_enabled: true,
      cancellation_hours: 24,
      walk_in_enabled: true,
      leaderboard_visible: false,
      kiosk_token: 'demo_kiosk_token_000000000000000',
    });
    if (sse) { console.error('shop_settings insert failed:', sse.message); process.exit(1); }
    console.log('✓ Created shop settings');
  }

  // ── 4. Services ──────────────────────────────────────────────────────────
  const { data: existingServices } = await sb.from('services').select('id, name, duration, price').eq('shop_id', shopId);
  let services;
  if (existingServices?.length) {
    services = existingServices;
    console.log(`✓ Services exist (${services.length})`);
  } else {
    const { data: svcs, error: sve } = await sb.from('services').insert([
      { shop_id: shopId, name: 'Haircut',         duration: 30, price: 30, category: 'Hair',  commission_type: 'percentage', commission_value: 50 },
      { shop_id: shopId, name: 'Haircut + Beard', duration: 45, price: 45, category: 'Hair',  commission_type: 'percentage', commission_value: 50 },
      { shop_id: shopId, name: 'Beard Trim',      duration: 20, price: 20, category: 'Beard', commission_type: 'percentage', commission_value: 50 },
      { shop_id: shopId, name: 'Skin Fade',       duration: 30, price: 35, category: 'Hair',  commission_type: 'percentage', commission_value: 50 },
      { shop_id: shopId, name: "Kid's Cut",       duration: 20, price: 20, category: 'Hair',  commission_type: 'percentage', commission_value: 50 },
    ]).select('id, name, duration, price');
    if (sve) { console.error('Services insert failed:', sve.message); process.exit(1); }
    services = svcs;
    console.log(`✓ Created ${services.length} services`);
  }

  const byName = (n) => services.find(s => s.name === n) ?? services[0];
  const haircut = byName('Haircut');
  const combo   = byName('Haircut + Beard');
  const beard   = byName('Beard Trim');
  const fade    = byName('Skin Fade');
  const kid     = byName("Kid's Cut");

  // ── 5. Barbers ───────────────────────────────────────────────────────────
  const { data: existingBarbers } = await sb.from('barbers').select('id, name').eq('shop_id', shopId);
  let barbers;
  if (existingBarbers?.length) {
    barbers = existingBarbers;
    console.log(`✓ Barbers exist (${barbers.length})`);
  } else {
    const { data: newBarbers, error: be } = await sb.from('barbers').insert([
      {
        shop_id: shopId, user_id: demoUserId,
        name: 'Marcus Johnson', email: DEMO_EMAIL,
        phone: '(555) 012-3456', is_active: true,
        online_bookable: true, permission_level: 'owner',
        hours: BARBER_HOURS,
        service_commission_rate: 50, product_commission_rate: 10,
      },
      {
        shop_id: shopId,
        name: 'Tyler Chen', email: 'tyler@demodemo.internal',
        phone: '(555) 234-5678', is_active: true,
        online_bookable: true, permission_level: 'barber',
        hours: BARBER_HOURS,
        service_commission_rate: 45, product_commission_rate: 10,
      },
      {
        shop_id: shopId,
        name: 'Devon Williams', email: 'devon@demodemo.internal',
        phone: '(555) 345-6789', is_active: true,
        online_bookable: true, permission_level: 'barber',
        hours: BARBER_HOURS,
        service_commission_rate: 45, product_commission_rate: 10,
      },
    ]).select('id, name');
    if (be) { console.error('Barbers insert failed:', be.message); process.exit(1); }
    barbers = newBarbers;
    console.log(`✓ Created ${barbers.length} barbers`);
  }
  const [marcus, tyler, devon] = barbers;

  // ── 6. Clients ───────────────────────────────────────────────────────────
  const { data: existingClients } = await sb.from('clients').select('id, name, email, phone').eq('shop_id', shopId);
  let clients;
  if (existingClients?.length) {
    clients = existingClients;
    console.log(`✓ Clients exist (${clients.length})`);
  } else {
    const { data: newClients, error: ce } = await sb.from('clients').insert([
      { shop_id: shopId, name: 'James Anderson',    first_name: 'James',       last_name: 'Anderson',  email: 'james.anderson@example.com',  phone: '(555) 111-1001', total_visits: 12, total_spent: 395.00, sms_opt_in: true  },
      { shop_id: shopId, name: 'Michael Thompson',  first_name: 'Michael',     last_name: 'Thompson',  email: 'michael.t@example.com',        phone: '(555) 111-1002', total_visits: 8,  total_spent: 270.00, sms_opt_in: true  },
      { shop_id: shopId, name: 'David Rodriguez',   first_name: 'David',       last_name: 'Rodriguez', email: 'david.r@example.com',          phone: '(555) 111-1003', total_visits: 5,  total_spent: 165.00, sms_opt_in: true  },
      { shop_id: shopId, name: 'Robert Kim',        first_name: 'Robert',      last_name: 'Kim',       email: 'robert.kim@example.com',       phone: '(555) 111-1004', total_visits: 3,  total_spent:  95.00, sms_opt_in: false },
      { shop_id: shopId, name: 'Christopher Davis', first_name: 'Christopher', last_name: 'Davis',     email: 'chris.davis@example.com',      phone: '(555) 111-1005', total_visits: 20, total_spent: 640.00, sms_opt_in: true  },
    ]).select('id, name, email, phone');
    if (ce) { console.error('Clients insert failed:', ce.message); process.exit(1); }
    clients = newClients;
    console.log(`✓ Created ${clients.length} clients`);
  }
  const [james, michael, david, robert, christopher] = clients;

  // ── 7. Bookings ──────────────────────────────────────────────────────────
  const { data: existingBookings } = await sb.from('bookings').select('id').eq('shop_id', shopId);
  if (existingBookings?.length) {
    console.log(`✓ Bookings exist (${existingBookings.length})`);
  } else {
    const bk = (barber, client, svc, dateStr, startTime, status = 'completed', extra = {}) => ({
      shop_id: shopId,
      barber_id:    barber.id,
      barber_name:  barber.name,
      client_id:    client?.id   ?? null,
      client_name:  client?.name ?? 'Walk-in',
      client_email: client?.email ?? null,
      client_phone: client?.phone ?? null,
      service_id:   svc.id,
      service_name: svc.name,
      date:         dateStr,
      start_time:   startTime,
      end_time:     addMinString(startTime, svc.duration),
      duration:     svc.duration,
      price:        svc.price,
      final_price:  svc.price,
      status,
      visit_type: 'appointment',
      source: 'admin',
      ...extra,
    });

    const rows = [
      // Past completed
      bk(marcus, christopher, haircut, workday(-5), '09:00', 'completed', { tip: 8,  payment_method: 'card', completed_at: workday(-5) + 'T09:35:00Z' }),
      bk(marcus, james,       combo,   workday(-5), '10:00', 'completed', { tip: 10, payment_method: 'card', completed_at: workday(-5) + 'T10:50:00Z' }),
      bk(tyler,  michael,     fade,    workday(-5), '09:30', 'completed', { tip: 7,  payment_method: 'cash', completed_at: workday(-5) + 'T10:05:00Z' }),
      bk(devon,  david,       beard,   workday(-5), '10:00', 'completed', { tip: 5,  payment_method: 'cash', completed_at: workday(-5) + 'T10:25:00Z' }),
      bk(marcus, robert,      haircut, workday(-3), '11:00', 'completed', { tip: 6,  payment_method: 'card', completed_at: workday(-3) + 'T11:35:00Z' }),
      bk(tyler,  christopher, combo,   workday(-3), '13:00', 'completed', { tip: 10, payment_method: 'card', completed_at: workday(-3) + 'T13:50:00Z' }),
      bk(devon,  james,       fade,    workday(-3), '09:00', 'completed', { tip: 8,  payment_method: 'card', completed_at: workday(-3) + 'T09:35:00Z' }),
      bk(marcus, michael,     kid,     workday(-1), '14:00', 'completed', { tip: 4,  payment_method: 'cash', completed_at: workday(-1) + 'T14:25:00Z' }),
      bk(tyler,  david,       haircut, workday(-1), '10:30', 'completed', { tip: 6,  payment_method: 'card', completed_at: workday(-1) + 'T11:05:00Z' }),
      bk(devon,  robert,      beard,   workday(-1), '15:00', 'completed', { tip: 5,  payment_method: 'card', completed_at: workday(-1) + 'T15:25:00Z' }),
      // Cancelled
      bk(marcus, james,       haircut, workday(-4), '13:00', 'cancelled', { cancel_reason: 'Client requested cancellation' }),
      bk(tyler,  michael,     combo,   workday(-2), '11:00', 'cancelled', { cancel_reason: 'No show' }),
      // Today
      bk(marcus, christopher, haircut, today, '09:00', 'scheduled'),
      bk(marcus, james,       combo,   today, '10:00', 'scheduled'),
      bk(tyler,  michael,     fade,    today, '09:30', 'scheduled'),
      bk(tyler,  david,       beard,   today, '11:00', 'scheduled'),
      bk(devon,  robert,      haircut, today, '10:30', 'checked_in', { checked_in_at: new Date().toISOString() }),
      bk(devon,  christopher, kid,     today, '13:00', 'scheduled'),
      // Upcoming
      bk(marcus, james,       haircut, workday(1), '09:00', 'scheduled'),
      bk(marcus, michael,     combo,   workday(1), '10:00', 'scheduled'),
      bk(tyler,  david,       fade,    workday(1), '11:00', 'scheduled'),
      bk(devon,  robert,      beard,   workday(1), '14:00', 'scheduled'),
      bk(marcus, christopher, haircut, workday(2), '09:30', 'scheduled'),
      bk(tyler,  james,       combo,   workday(2), '10:00', 'scheduled'),
      bk(devon,  michael,     fade,    workday(3), '13:00', 'scheduled'),
    ];

    const { error: bke } = await sb.from('bookings').insert(rows);
    if (bke) { console.error('Bookings insert failed:', bke.message); process.exit(1); }
    console.log(`✓ Created ${rows.length} bookings`);
  }

  // ── 8. Cash transactions ─────────────────────────────────────────────────
  const { data: existingTx } = await sb.from('cash_transactions').select('id').eq('shop_id', shopId);
  if (existingTx?.length) {
    console.log(`✓ Transactions exist (${existingTx.length})`);
  } else {
    const wd1 = workday(-1);
    const wd3 = workday(-3);
    const { error: txe } = await sb.from('cash_transactions').insert([
      { shop_id: shopId, type: 'income',  amount: 35, barber_id: marcus.id, barber_name: marcus.name, date: wd1, time: '10:00', note: 'Skin Fade — cash payment' },
      { shop_id: shopId, type: 'income',  amount: 20, barber_id: tyler.id,  barber_name: tyler.name,  date: wd1, time: '11:30', note: 'Beard Trim — cash payment' },
      { shop_id: shopId, type: 'expense', amount: 45, barber_id: null,       barber_name: null,        date: wd3, time: '09:00', note: 'Barbershop supplies restock' },
    ]);
    if (txe) { console.error('Transactions insert failed:', txe.message); process.exit(1); }
    console.log('✓ Created cash transactions');
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  console.log(`
✅ Demo shop ready
   Shop ID  : ${shopId}
   Login    : ${DEMO_EMAIL}
   Password : ${DEMO_PASSWORD}
`);
}

run().catch(err => { console.error(err); process.exit(1); });
