-- =============================================================================
-- Stand Tall Barbershop — Supabase Database Schema
-- =============================================================================
-- Run this file once against a fresh Supabase project via the SQL editor or
-- the Supabase CLI:  supabase db push
--
-- Entities covered (15 tables + users):
--   barbers, services, clients, bookings, products, discounts, shop_settings,
--   notifications, time_off_requests, cash_transactions, inventory_adjustments,
--   barber_sensitive_info, barber_password, role_permissions, reviews, users
-- =============================================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";


-- =============================================================================
-- TABLES
-- (ordered so that FK references never point to a table not yet created)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- barbers
-- -----------------------------------------------------------------------------
create table public.barbers (
  id                      uuid        primary key default uuid_generate_v4(),
  name                    text        not null,
  email                   text,
  phone                   text,
  photo_url               text,
  service_commission_rate numeric     default 50,
  product_commission_rate numeric     default 10,
  -- permission_level drives what the barber can see/do in the app
  permission_level        text        default 'service_provider'
                            check (permission_level in ('service_provider','manager','owner')),
  is_active               boolean     default true,
  online_bookable         boolean     default true,
  bookings_blocked        boolean     default false,
  -- user_id links this barber record to a Supabase auth user
  user_id                 uuid        references auth.users(id) on delete set null,
  -- per-day availability: { monday: { start, end, closed }, ... }
  hours                   jsonb,
  -- per-service duration overrides: { [service_id]: minutes }
  service_durations       jsonb,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- services
-- -----------------------------------------------------------------------------
create table public.services (
  id               uuid    primary key default uuid_generate_v4(),
  name             text    not null,
  duration         integer default 30,   -- minutes
  price            numeric default 0,
  category         text,
  commission_type  text    default 'percentage'
                     check (commission_type in ('percentage','fixed')),
  commission_value numeric default 50,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- clients
-- -----------------------------------------------------------------------------
create table public.clients (
  id                    uuid    primary key default uuid_generate_v4(),
  name                  text    not null,
  email                 text,
  phone                 text,
  photo_url             text,
  preferred_barber_ids  uuid[],
  preferred_service_ids uuid[],
  preferred_brands      text[],
  staff_notes           text,
  -- free-form JSON for miscellaneous client preferences
  preferences           jsonb,
  total_visits          integer default 0,
  total_spent           numeric default 0,
  last_visit            date,
  no_show_count         integer default 0,
  late_count            integer default 0,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- bookings
-- -----------------------------------------------------------------------------
create table public.bookings (
  id             uuid    primary key default uuid_generate_v4(),
  -- denormalised client fields kept for history / offline-friendly display
  client_name    text    not null,
  client_phone   text,
  client_email   text,
  client_id      uuid    references public.clients(id) on delete set null,
  barber_id      uuid    not null references public.barbers(id) on delete restrict,
  barber_name    text,
  service_id     uuid    not null references public.services(id) on delete restrict,
  service_name   text,
  date           date    not null,
  start_time     text    not null,  -- HH:MM
  end_time       text,              -- HH:MM
  duration       integer,           -- minutes
  price          numeric,
  status         text    default 'scheduled'
                   check (status in ('scheduled','confirmed','checked_in',
                                     'completed','cancelled','no_show')),
  payment_method text    default 'cash'
                   check (payment_method in ('cash','card','other')),
  discount_type  text    default 'none'
                   check (discount_type in ('none','percentage','fixed')),
  discount_value numeric default 0,
  final_price    numeric,
  notes          text,
  cancel_reason  text,
  -- NR=New Request, NNR=New Non-Request, RR=Return Request, RNR=Return Non-Request
  visit_type     text    check (visit_type in ('NR','NNR','RR','RNR')),
  -- links all bookings that belong to the same recurring series
  repeat_group_id uuid,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- products
-- -----------------------------------------------------------------------------
create table public.products (
  id               uuid    primary key default uuid_generate_v4(),
  name             text    not null,
  sku              text,
  category         text,
  cost_per_unit    numeric default 0,
  retail_price     numeric default 0,
  stock_quantity   integer default 0,
  tax_enabled      boolean default true,
  tax_rate         numeric default 7.5,
  commission_type  text    default 'percentage'
                     check (commission_type in ('percentage','fixed')),
  commission_value numeric default 10,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- discounts
-- -----------------------------------------------------------------------------
create table public.discounts (
  id         uuid    primary key default uuid_generate_v4(),
  name       text    not null,
  type       text    not null check (type in ('percentage','fixed')),
  value      numeric not null,
  is_active  boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- shop_settings  (singleton — the app always reads the first row)
-- -----------------------------------------------------------------------------
create table public.shop_settings (
  id                      uuid    primary key default uuid_generate_v4(),
  shop_name               text    default 'Stand Tall Barbershop',
  -- { monday: { start: "09:00", end: "18:00", closed: false }, ... }
  operating_hours         jsonb,
  timezone                text    default 'America/New_York',
  default_commission_rate numeric default 50,
  default_tax_rate        numeric default 7.5,
  default_service_tax_rate numeric default 0,
  -- simple PIN-style admin passwords used in the app UI
  admin_password_1        text    default '2024',
  admin_password_2        text    default '1212',
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
create table public.notifications (
  id             uuid    primary key default uuid_generate_v4(),
  recipient_email text,
  recipient_type  text,   -- e.g. 'staff'
  type            text,
  title           text,
  message         text,
  booking_id      uuid    references public.bookings(id) on delete set null,
  client_id       uuid    references public.clients(id) on delete set null,
  is_read         boolean default false,
  email_sent      boolean default false,
  date            date    default current_date,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- time_off_requests
-- -----------------------------------------------------------------------------
create table public.time_off_requests (
  id            uuid    primary key default uuid_generate_v4(),
  barber_id     uuid    not null references public.barbers(id) on delete cascade,
  barber_name   text,
  start_date    date    not null,
  end_date      date    not null,
  reason        text,
  status        text    default 'pending'
                  check (status in ('pending','approved','denied')),
  reviewed_by   text,
  reviewed_date date,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- cash_transactions
-- -----------------------------------------------------------------------------
create table public.cash_transactions (
  id         uuid    primary key default uuid_generate_v4(),
  type       text    not null check (type in ('inflow','outflow','withdrawal')),
  amount     numeric not null default 0,
  date       date    not null default current_date,
  time       text,   -- HH:MM
  note       text,
  barber_name text,
  barber_id   uuid   references public.barbers(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- inventory_adjustments
-- -----------------------------------------------------------------------------
create table public.inventory_adjustments (
  id              uuid    primary key default uuid_generate_v4(),
  product_id      uuid    not null references public.products(id) on delete cascade,
  product_name    text,
  adjustment_type text    not null check (adjustment_type in ('add','subtract')),
  quantity        integer not null,
  reason          text,
  notes           text,
  date            date    not null default current_date,
  adjusted_by     text,
  created_at      timestamptz default now()
  -- no updated_at: adjustments are immutable audit records
);

-- -----------------------------------------------------------------------------
-- barber_sensitive_info  (banking & tax data — restricted access)
-- -----------------------------------------------------------------------------
create table public.barber_sensitive_info (
  id                      uuid primary key default uuid_generate_v4(),
  barber_id               uuid not null references public.barbers(id) on delete cascade,
  full_legal_name         text,
  ssn                     text,   -- store encrypted in production
  drivers_license_number  text,
  bank_name               text,
  account_number          text,   -- store encrypted in production
  routing_number          text,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- barber_password  (custom PIN/password auth separate from Supabase auth)
-- This table has RLS enabled but NO policies, so it is only accessible via
-- the service role (Edge Functions). Clients can never read or write it.
-- -----------------------------------------------------------------------------
create table public.barber_password (
  id            uuid    primary key default uuid_generate_v4(),
  barber_id     uuid    not null references public.barbers(id) on delete cascade,
  email         text    not null,
  password_hash text    not null,
  is_temp       boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- role_permissions
-- -----------------------------------------------------------------------------
create table public.role_permissions (
  id                   uuid    primary key default uuid_generate_v4(),
  role                 text    not null check (role in ('service_provider','manager','owner')),
  view_calendar        boolean default true,
  create_booking       boolean default true,
  edit_booking         boolean default true,
  cancel_booking       boolean default true,
  checkout_booking     boolean default true,
  edit_booking_contact boolean default true,
  view_client_contact  boolean default false,
  view_client_notes    boolean default true,
  edit_client_notes    boolean default true,
  view_shop_reports    boolean default false,
  view_personal_reports boolean default false,
  view_payroll         boolean default false,
  view_inventory       boolean default false,
  manage_staff         boolean default false,
  view_cash_tracker    boolean default false,
  manage_settings      boolean default false,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- reviews
-- -----------------------------------------------------------------------------
create table public.reviews (
  id         uuid    primary key default uuid_generate_v4(),
  barber_id  uuid    references public.barbers(id) on delete set null,
  client_id  uuid    references public.clients(id) on delete set null,
  booking_id uuid    references public.bookings(id) on delete set null,
  rating     integer check (rating between 1 and 5),
  comment    text,
  created_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- users  (one row per Supabase auth user; auto-populated by trigger below)
-- -----------------------------------------------------------------------------
create table public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  role       text default 'staff',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


-- =============================================================================
-- INDEXES
-- =============================================================================

create index bookings_barber_date_idx      on public.bookings(barber_id, date);
create index bookings_date_idx             on public.bookings(date);
create index bookings_status_idx           on public.bookings(status);
create index bookings_client_id_idx        on public.bookings(client_id);
create index bookings_created_at_idx       on public.bookings(created_at desc);
create index notifications_recipient_idx   on public.notifications(recipient_email, is_read);
create index notifications_created_at_idx  on public.notifications(created_at desc);
create index time_off_barber_idx           on public.time_off_requests(barber_id, status);
create index cash_tx_date_idx              on public.cash_transactions(date desc);
create index inventory_adj_product_idx     on public.inventory_adjustments(product_id);
create index clients_email_idx             on public.clients(email);
create index barbers_user_id_idx           on public.barbers(user_id);


-- =============================================================================
-- UPDATED_AT TRIGGER
-- Automatically stamps updated_at on every UPDATE.
-- =============================================================================

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.barbers
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.services
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.clients
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.bookings
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.products
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.discounts
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.shop_settings
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.notifications
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.time_off_requests
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.cash_transactions
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.barber_sensitive_info
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.barber_password
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.role_permissions
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.users
  for each row execute function public.handle_updated_at();


-- =============================================================================
-- USER PROVISIONING TRIGGER
-- Inserts a row into public.users whenever a new Supabase auth user signs up.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.barbers              enable row level security;
alter table public.services             enable row level security;
alter table public.clients              enable row level security;
alter table public.bookings             enable row level security;
alter table public.products             enable row level security;
alter table public.discounts            enable row level security;
alter table public.shop_settings        enable row level security;
alter table public.notifications        enable row level security;
alter table public.time_off_requests    enable row level security;
alter table public.cash_transactions    enable row level security;
alter table public.inventory_adjustments enable row level security;
alter table public.barber_sensitive_info enable row level security;
alter table public.barber_password      enable row level security;
alter table public.role_permissions     enable row level security;
alter table public.reviews              enable row level security;
alter table public.users                enable row level security;


-- =============================================================================
-- RLS POLICIES
-- Two-tier model:
--   anon  → booking page only (read barbers/services/shop, insert bookings)
--   authenticated → full CRUD on everything (app enforces role checks in JS)
--
-- barber_password has NO policies → service role only (Edge Functions).
-- =============================================================================

-- ── barbers ──────────────────────────────────────────────────────────────────
-- Unauthenticated clients can read active barbers to populate the booking page.
create policy "anon: read active barbers"
  on public.barbers for select to anon
  using (is_active = true);

create policy "auth: full access"
  on public.barbers for all to authenticated
  using (true) with check (true);

-- ── services ─────────────────────────────────────────────────────────────────
-- Unauthenticated clients can read services to populate the booking page.
create policy "anon: read services"
  on public.services for select to anon
  using (true);

create policy "auth: full access"
  on public.services for all to authenticated
  using (true) with check (true);

-- ── shop_settings ────────────────────────────────────────────────────────────
-- Booking page needs shop name, hours, etc.
create policy "anon: read shop settings"
  on public.shop_settings for select to anon
  using (true);

create policy "auth: full access"
  on public.shop_settings for all to authenticated
  using (true) with check (true);

-- ── bookings ─────────────────────────────────────────────────────────────────
-- Public self-booking: anonymous clients can create bookings only.
create policy "anon: create bookings"
  on public.bookings for insert to anon
  with check (true);

create policy "auth: full access"
  on public.bookings for all to authenticated
  using (true) with check (true);

-- ── clients ──────────────────────────────────────────────────────────────────
create policy "auth: full access"
  on public.clients for all to authenticated
  using (true) with check (true);

-- ── products ─────────────────────────────────────────────────────────────────
create policy "auth: full access"
  on public.products for all to authenticated
  using (true) with check (true);

-- ── discounts ────────────────────────────────────────────────────────────────
create policy "auth: full access"
  on public.discounts for all to authenticated
  using (true) with check (true);

-- ── notifications ────────────────────────────────────────────────────────────
create policy "auth: full access"
  on public.notifications for all to authenticated
  using (true) with check (true);

-- ── time_off_requests ────────────────────────────────────────────────────────
create policy "auth: full access"
  on public.time_off_requests for all to authenticated
  using (true) with check (true);

-- ── cash_transactions ────────────────────────────────────────────────────────
create policy "auth: full access"
  on public.cash_transactions for all to authenticated
  using (true) with check (true);

-- ── inventory_adjustments ────────────────────────────────────────────────────
create policy "auth: full access"
  on public.inventory_adjustments for all to authenticated
  using (true) with check (true);

-- ── barber_sensitive_info ────────────────────────────────────────────────────
-- Accessible to all authenticated users here; the app enforces owner/manager
-- permission checks before querying this table.
create policy "auth: full access"
  on public.barber_sensitive_info for all to authenticated
  using (true) with check (true);

-- ── barber_password ──────────────────────────────────────────────────────────
-- Intentionally no policies. RLS is enabled so anon and authenticated roles
-- are denied. Only the service role (used by Edge Functions) can read/write.

-- ── role_permissions ─────────────────────────────────────────────────────────
create policy "auth: full access"
  on public.role_permissions for all to authenticated
  using (true) with check (true);

-- ── reviews ──────────────────────────────────────────────────────────────────
create policy "auth: full access"
  on public.reviews for all to authenticated
  using (true) with check (true);

-- ── users ────────────────────────────────────────────────────────────────────
create policy "auth: full access"
  on public.users for all to authenticated
  using (true) with check (true);


-- =============================================================================
-- SEED: default role_permissions rows
-- =============================================================================

insert into public.role_permissions (role, view_calendar, create_booking, edit_booking,
  cancel_booking, checkout_booking, edit_booking_contact, view_client_contact,
  view_client_notes, edit_client_notes, view_shop_reports, view_personal_reports,
  view_payroll, view_inventory, manage_staff, view_cash_tracker, manage_settings)
values
  -- service_provider: core booking tasks only
  ('service_provider', true,  true,  true,  true,  true,  true,  false,
   true,  true,  false, false, false, false, false, false, false),
  -- manager: everything except staff/settings management
  ('manager',          true,  true,  true,  true,  true,  true,  true,
   true,  true,  true,  true,  true,  true,  false, true,  false),
  -- owner: unrestricted
  ('owner',            true,  true,  true,  true,  true,  true,  true,
   true,  true,  true,  true,  true,  true,  true,  true,  true);
