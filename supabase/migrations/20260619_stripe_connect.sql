-- Stage 1: Stripe Connect Standard
-- Adds connected account storage + deposit config to shops table.
-- Enables RLS on shops so the public booking page can read stripe/deposit info.

alter table public.shops
  add column if not exists stripe_account_id      text,
  add column if not exists stripe_connect_status  text not null default 'not_connected',
  add column if not exists deposits_enabled        boolean not null default false,
  add column if not exists deposit_amount          integer not null default 2000;  -- cents

-- Add deposit_payment_intent_id to bookings for audit trail
alter table public.bookings
  add column if not exists deposit_payment_intent_id text;

-- Enable RLS on shops (was not enabled before)
alter table public.shops enable row level security;

-- Anyone can read shop info (needed by the public booking page)
create policy "Public can read shop info"
  on public.shops for select
  to anon, authenticated
  using (true);

-- Only authenticated users can update their own shop
create policy "Owner can update their shop"
  on public.shops for update
  to authenticated
  using (id = (select shop_id from public.barbers where user_id = auth.uid() limit 1))
  with check (id = (select shop_id from public.barbers where user_id = auth.uid() limit 1));
