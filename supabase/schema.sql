-- ============================================================
-- Stand Tall Barbershop — Supabase Schema
-- Run this in the Supabase SQL Editor to create all tables.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.barbers (
  id                      uuid primary key default uuid_generate_v4(),
  name                    text not null,
  email                   text unique,
  phone                   text,
  is_active               boolean default true,
  online_bookable         boolean default true,
  photo_url               text,
  service_commission_rate numeric(5,2) default 0,
  product_commission_rate numeric(5,2) default 0,
  permission_level        text default 'service_provider', -- service_provider | manager | owner
  hours                   jsonb,
  bookings_blocked        boolean default false,
  available_services      jsonb,
  service_durations       jsonb,
  service_prices          jsonb,
  user_id                 uuid,
  created_at              timestamptz default now()
);

create table if not exists public.services (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  duration         integer default 30,     -- minutes
  price            numeric(10,2) default 0,
  category         text,
  commission_type  text default 'percentage', -- percentage | fixed
  commission_value numeric(10,2) default 0,
  created_at       timestamptz default now()
);

create table if not exists public.clients (
  id                    uuid primary key default uuid_generate_v4(),
  name                  text not null,
  email                 text,
  phone                 text,
  photo_url             text,
  total_visits          integer default 0,
  total_spent           numeric(10,2) default 0,
  no_show_count         integer default 0,
  late_count            integer default 0,
  staff_notes           text,
  preferred_barber_ids  jsonb,
  preferred_service_ids jsonb,
  last_visit            date,
  created_at            timestamptz default now()
);

create table if not exists public.bookings (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid references public.clients(id) on delete set null,
  client_name     text,
  client_email    text,
  client_phone    text,
  barber_id       uuid references public.barbers(id) on delete set null,
  barber_name     text,
  service_id      uuid references public.services(id) on delete set null,
  service_name    text,
  date            date not null,
  start_time      text,
  end_time        text,
  duration        integer,
  status          text default 'scheduled', -- scheduled | confirmed | checked_in | completed | cancelled | no_show
  price           numeric(10,2) default 0,
  final_price     numeric(10,2),
  visit_type      text,                    -- NR | RR | RNR | NNR | walk-in | call-in
  cancel_reason   text,
  repeat_group_id uuid,
  created_date    timestamptz default now()
);

create table if not exists public.shop_settings (
  id                        uuid primary key default uuid_generate_v4(),
  operating_hours           jsonb,
  default_tax_rate          numeric(5,2) default 0,
  default_service_tax_rate  numeric(5,2) default 0,
  cancellation_enabled      boolean default false,
  cancellation_hours        integer default 24,
  cancellation_policy_text  text,
  noshow_enabled            boolean default false,
  noshow_policy_text        text,
  created_at                timestamptz default now()
);

-- NOTE: barbers use a custom login (not Supabase Auth).
-- The anon role needs SELECT on this table for barberLogin to work,
-- and UPDATE for changeBarberPassword.
create table if not exists public.barber_passwords (
  id            uuid primary key default uuid_generate_v4(),
  barber_id     uuid references public.barbers(id) on delete cascade,
  email         text,
  password_hash text not null,
  is_temp       boolean default true,
  created_at    timestamptz default now()
);

create table if not exists public.discounts (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  type       text default 'percentage', -- percentage | fixed
  value      numeric(10,2) default 0,
  is_active  boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.role_permissions (
  id                   uuid primary key default uuid_generate_v4(),
  role                 text unique not null, -- service_provider | manager | owner
  view_calendar        boolean default true,
  create_booking       boolean default true,
  edit_booking         boolean default false,
  cancel_booking       boolean default false,
  checkout_booking     boolean default false,
  edit_booking_contact boolean default false,
  view_client_contact  boolean default false,
  view_client_notes    boolean default false,
  edit_client_notes    boolean default false,
  view_shop_reports    boolean default false,
  view_personal_reports boolean default true,
  view_payroll         boolean default false,
  view_inventory       boolean default false,
  manage_staff         boolean default false,
  view_cash_tracker    boolean default false,
  manage_settings      boolean default false,
  created_at           timestamptz default now()
);

create table if not exists public.cash_transactions (
  id           uuid primary key default uuid_generate_v4(),
  type         text not null,             -- inflow | outflow | withdrawal
  amount       numeric(10,2) not null,
  barber_id    uuid references public.barbers(id) on delete set null,
  barber_name  text,
  date         date default current_date,
  time         text,
  note         text,
  created_date timestamptz default now()
);

create table if not exists public.notifications (
  id           uuid primary key default uuid_generate_v4(),
  title        text,
  message      text,
  is_read      boolean default false,
  created_date timestamptz default now()
);

-- The app references this table as "products" (not "inventory").
create table if not exists public.products (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  sku              text,
  category         text,
  cost_per_unit    numeric(10,2) default 0,
  retail_price     numeric(10,2) default 0,
  stock_quantity   integer default 0,
  tax_enabled      boolean default false,
  tax_rate         numeric(5,2) default 0,
  total_units_sold integer default 0,
  total_revenue    numeric(10,2) default 0,
  commission_type  text default 'percentage', -- percentage | fixed
  commission_value numeric(10,2) default 0,
  created_at       timestamptz default now()
);

create table if not exists public.inventory_adjustments (
  id              uuid primary key default uuid_generate_v4(),
  product_id      uuid references public.products(id) on delete set null,
  product_name    text,
  adjustment_type text,                   -- add | subtract
  quantity        integer default 0,
  reason          text,
  notes           text,
  date            date default current_date,
  adjusted_by     text,
  created_at      timestamptz default now()
);

create table if not exists public.payroll_reports (
  id                 uuid primary key default uuid_generate_v4(),
  barber_id          uuid references public.barbers(id) on delete set null,
  barber_name        text,
  barber_email       text,
  period_start       date,
  period_end         date,
  service_revenue    numeric(10,2) default 0,
  service_commission numeric(10,2) default 0,
  product_commission numeric(10,2) default 0,
  tips               numeric(10,2) default 0,
  total_earnings     numeric(10,2) default 0,
  bookings_count     integer default 0,
  bookings           jsonb,
  created_at         timestamptz default now()
);

-- Additional tables referenced in the codebase --

create table if not exists public.time_off_requests (
  id            uuid primary key default uuid_generate_v4(),
  barber_id     uuid references public.barbers(id) on delete cascade,
  barber_name   text,
  start_date    date,
  end_date      date,
  reason        text,
  status        text default 'pending',   -- pending | approved | denied
  reviewed_by   text,
  reviewed_date date,
  created_date  timestamptz default now()
);

create table if not exists public.barber_sensitive_info (
  id                      uuid primary key default uuid_generate_v4(),
  barber_id               uuid references public.barbers(id) on delete cascade unique,
  full_legal_name         text,
  drivers_license_number  text,
  ssn                     text,
  bank_name               text,
  account_number          text,
  routing_number          text,
  created_at              timestamptz default now()
);

create table if not exists public.reviews (
  id         uuid primary key default uuid_generate_v4(),
  client_id  uuid references public.clients(id) on delete set null,
  barber_id  uuid references public.barbers(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  rating     integer check (rating >= 1 and rating <= 5),
  comment    text,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.bookings enable row level security;
alter table public.shop_settings enable row level security;
alter table public.barber_passwords enable row level security;
alter table public.discounts enable row level security;
alter table public.role_permissions enable row level security;
alter table public.cash_transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.products enable row level security;
alter table public.inventory_adjustments enable row level security;
alter table public.payroll_reports enable row level security;
alter table public.time_off_requests enable row level security;
alter table public.barber_sensitive_info enable row level security;
alter table public.reviews enable row level security;

-- ---- Public read: barbers, services, shop_settings ----

create policy "Public can read barbers"
  on public.barbers for select using (true);

create policy "Public can read services"
  on public.services for select using (true);

create policy "Public can read shop_settings"
  on public.shop_settings for select using (true);

-- ---- Public read/write on role_permissions (barbers use anon key) ----

create policy "Public can read role_permissions"
  on public.role_permissions for select using (true);

-- ---- Public create: bookings (online booking form) ----

create policy "Public can create bookings"
  on public.bookings for insert with check (true);

-- ---- Barber custom auth: anon needs access to barber_passwords ----
-- Barbers authenticate with a custom password table, not Supabase Auth,
-- so their requests always use the anon key.

create policy "Public can read barber_passwords"
  on public.barber_passwords for select using (true);

create policy "Public can update barber_passwords"
  on public.barber_passwords for update using (true) with check (true);

-- ---- Authenticated full access: all tables ----

create policy "Authenticated full access barbers"
  on public.barbers for all to authenticated using (true) with check (true);

create policy "Authenticated full access services"
  on public.services for all to authenticated using (true) with check (true);

create policy "Authenticated full access clients"
  on public.clients for all to authenticated using (true) with check (true);

create policy "Authenticated full access bookings"
  on public.bookings for all to authenticated using (true) with check (true);

create policy "Authenticated full access shop_settings"
  on public.shop_settings for all to authenticated using (true) with check (true);

create policy "Authenticated full access barber_passwords"
  on public.barber_passwords for all to authenticated using (true) with check (true);

create policy "Authenticated full access discounts"
  on public.discounts for all to authenticated using (true) with check (true);

create policy "Authenticated full access role_permissions"
  on public.role_permissions for all to authenticated using (true) with check (true);

create policy "Authenticated full access cash_transactions"
  on public.cash_transactions for all to authenticated using (true) with check (true);

create policy "Authenticated full access notifications"
  on public.notifications for all to authenticated using (true) with check (true);

create policy "Authenticated full access products"
  on public.products for all to authenticated using (true) with check (true);

create policy "Authenticated full access inventory_adjustments"
  on public.inventory_adjustments for all to authenticated using (true) with check (true);

create policy "Authenticated full access payroll_reports"
  on public.payroll_reports for all to authenticated using (true) with check (true);

create policy "Authenticated full access time_off_requests"
  on public.time_off_requests for all to authenticated using (true) with check (true);

create policy "Authenticated full access barber_sensitive_info"
  on public.barber_sensitive_info for all to authenticated using (true) with check (true);

create policy "Authenticated full access reviews"
  on public.reviews for all to authenticated using (true) with check (true);

-- ============================================================
-- SEED: Default role permissions
-- ============================================================

insert into public.role_permissions (role, view_calendar, create_booking, edit_booking, cancel_booking, checkout_booking, edit_booking_contact, view_client_contact, view_client_notes, edit_client_notes, view_shop_reports, view_personal_reports, view_payroll, view_inventory, manage_staff, view_cash_tracker, manage_settings)
values
  ('service_provider', true,  true,  false, false, false, false, false, false, false, false, true,  false, false, false, false, false),
  ('manager',          true,  true,  true,  true,  true,  true,  true,  true,  true,  false, true,  false, true,  false, true,  false),
  ('owner',            true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true)
on conflict (role) do nothing;
