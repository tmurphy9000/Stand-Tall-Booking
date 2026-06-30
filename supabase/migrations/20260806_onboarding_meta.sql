-- ─────────────────────────────────────────────────────────────────────────────
-- Guided Setup Walkthrough — onboarding_meta on shops
-- ─────────────────────────────────────────────────────────────────────────────
-- Stores per-shop onboarding state. Auto-detected steps (shop name/address,
-- services count, barbers count, stripe) are computed live; only steps that
-- cannot be auto-detected are stored here as booleans.
--
-- Shape:
--   {
--     "manual_steps": { "hours": bool, "social": bool, "clients": bool,
--                       "share": bool, "url_slug": bool },
--     "completed": bool,
--     "feature_overview_seen": bool
--   }

alter table public.shops
  add column if not exists onboarding_meta jsonb not null default '{}'::jsonb;

-- Owner/superadmin can update their own shop row (covers onboarding_meta and
-- any other shop-level fields like url_slug, stripe_account_id).
drop policy if exists "shops_owner_update" on public.shops;
create policy "shops_owner_update" on public.shops
  for update to authenticated
  using (
    exists (
      select 1 from public.barbers
      where user_id = auth.uid()
        and shop_id  = shops.id
        and permission_level = any(array['owner','manager','superadmin'])
    )
  )
  with check (
    exists (
      select 1 from public.barbers
      where user_id = auth.uid()
        and shop_id  = shops.id
        and permission_level = any(array['owner','manager','superadmin'])
    )
  );
