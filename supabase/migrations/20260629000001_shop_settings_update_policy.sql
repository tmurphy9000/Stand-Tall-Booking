-- Ensure authenticated users can UPDATE their own shop_settings row.
--
-- The phase2 migration created "Shop access shop_settings" as a FOR ALL
-- policy, which should cover UPDATE.  If that policy is missing or the
-- current_shop_id() helper returns null for the owner's session, the UPDATE
-- silently drops to 0 rows or returns a 400.  This migration adds an
-- explicit UPDATE-only policy using the same subquery pattern as the
-- "Owner can update their shop" policy on the shops table, so it works even
-- when the barber row's user_id column has not been backfilled.
--
-- Both the USING and WITH CHECK subqueries check via barbers (primary) and
-- subscriptions (fallback), matching current_shop_id() logic exactly.

drop policy if exists "Shop owner can update shop_settings" on public.shop_settings;

create policy "Shop owner can update shop_settings"
  on public.shop_settings
  for update
  to authenticated
  using (
    shop_id = coalesce(
      (select shop_id from public.barbers      where user_id = auth.uid() limit 1),
      (select shop_id from public.subscriptions where user_id = auth.uid() limit 1)
    )
  )
  with check (
    shop_id = coalesce(
      (select shop_id from public.barbers      where user_id = auth.uid() limit 1),
      (select shop_id from public.subscriptions where user_id = auth.uid() limit 1)
    )
  );
