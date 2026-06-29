-- Ensure anon users can SELECT from shop_settings on the public booking page.
--
-- ClientBooking.jsx reads deposit_enabled, deposit_percentage,
-- deposit_pretip_enabled, and other booking-page settings as an
-- unauthenticated (anon) Supabase client.  Migration 20260616 dropped the
-- original "Anon full access shop_settings" policy and replaced it with
-- "Anon access shop_settings"; if 20260616 never ran on a given database
-- the anon read path is broken and depositConfig.enabled always stays false.
--
-- This migration idempotently recreates a SELECT-only anon policy so the
-- deposit step always has the data it needs regardless of migration history.

drop policy if exists "Anon read shop_settings" on public.shop_settings;

create policy "Anon read shop_settings"
  on public.shop_settings
  for select
  to anon
  using (true);
