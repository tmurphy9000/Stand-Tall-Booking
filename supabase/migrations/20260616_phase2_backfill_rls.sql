-- Multi-tenancy Phase 2: backfill shop_id on the remaining tables to the
-- existing shop, make shop_id required, and scope RLS by shop.
--
-- Shop resolution is primarily through barbers.user_id -> barbers.shop_id
-- (every barber/owner authenticates via Supabase Auth and has a barbers
-- row), with public.subscriptions as a fallback for future SaaS
-- subscribers who don't have a barbers row yet.

-- ============================================================
-- BACKFILL
-- ============================================================

update public.barbers set shop_id = '00000000-0000-0000-0000-000000000001' where shop_id is null;
update public.services set shop_id = '00000000-0000-0000-0000-000000000001' where shop_id is null;
update public.bookings set shop_id = '00000000-0000-0000-0000-000000000001' where shop_id is null;
update public.shop_settings set shop_id = '00000000-0000-0000-0000-000000000001' where shop_id is null;
update public.discounts set shop_id = '00000000-0000-0000-0000-000000000001' where shop_id is null;
update public.products set shop_id = '00000000-0000-0000-0000-000000000001' where shop_id is null;
update public.inventory_adjustments set shop_id = '00000000-0000-0000-0000-000000000001' where shop_id is null;
update public.cash_transactions set shop_id = '00000000-0000-0000-0000-000000000001' where shop_id is null;
update public.payroll_reports set shop_id = '00000000-0000-0000-0000-000000000001' where shop_id is null;
update public.reviews set shop_id = '00000000-0000-0000-0000-000000000001' where shop_id is null;
update public.time_off_requests set shop_id = '00000000-0000-0000-0000-000000000001' where shop_id is null;
update public.barber_passwords set shop_id = '00000000-0000-0000-0000-000000000001' where shop_id is null;
update public.barber_sensitive_info set shop_id = '00000000-0000-0000-0000-000000000001' where shop_id is null;
update public.role_permissions set shop_id = '00000000-0000-0000-0000-000000000001' where shop_id is null;
update public.notifications set shop_id = '00000000-0000-0000-0000-000000000001' where shop_id is null;
update public.otp_codes set shop_id = '00000000-0000-0000-0000-000000000001' where shop_id is null;

-- ============================================================
-- SHOP RESOLUTION HELPER
-- ============================================================

-- security definer so this can be called from RLS policies (including the
-- barbers policy itself) without recursing into RLS on public.barbers.
create or replace function public.current_shop_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select shop_id from public.barbers where user_id = auth.uid() limit 1),
    (select shop_id from public.subscriptions where user_id = auth.uid() limit 1)
  )
$$;

-- ============================================================
-- COLUMN DEFAULTS + NOT NULL
-- ============================================================

alter table public.barbers alter column shop_id set default public.current_shop_id();
alter table public.services alter column shop_id set default public.current_shop_id();
alter table public.bookings alter column shop_id set default public.current_shop_id();
alter table public.shop_settings alter column shop_id set default public.current_shop_id();
alter table public.discounts alter column shop_id set default public.current_shop_id();
alter table public.products alter column shop_id set default public.current_shop_id();
alter table public.inventory_adjustments alter column shop_id set default public.current_shop_id();
alter table public.cash_transactions alter column shop_id set default public.current_shop_id();
alter table public.payroll_reports alter column shop_id set default public.current_shop_id();
alter table public.reviews alter column shop_id set default public.current_shop_id();
alter table public.time_off_requests alter column shop_id set default public.current_shop_id();
alter table public.barber_passwords alter column shop_id set default public.current_shop_id();
alter table public.barber_sensitive_info alter column shop_id set default public.current_shop_id();
alter table public.role_permissions alter column shop_id set default public.current_shop_id();
alter table public.notifications alter column shop_id set default public.current_shop_id();

-- otp_codes is written only by service-role edge functions (no auth.uid()),
-- and isn't part of shop-scoped RLS, so it gets a literal default instead.
alter table public.otp_codes alter column shop_id set default '00000000-0000-0000-0000-000000000001';

alter table public.barbers alter column shop_id set not null;
alter table public.services alter column shop_id set not null;
alter table public.bookings alter column shop_id set not null;
alter table public.shop_settings alter column shop_id set not null;
alter table public.discounts alter column shop_id set not null;
alter table public.products alter column shop_id set not null;
alter table public.inventory_adjustments alter column shop_id set not null;
alter table public.cash_transactions alter column shop_id set not null;
alter table public.payroll_reports alter column shop_id set not null;
alter table public.reviews alter column shop_id set not null;
alter table public.time_off_requests alter column shop_id set not null;
alter table public.barber_passwords alter column shop_id set not null;
alter table public.barber_sensitive_info alter column shop_id set not null;
alter table public.role_permissions alter column shop_id set not null;
alter table public.notifications alter column shop_id set not null;
alter table public.otp_codes alter column shop_id set not null;

-- ============================================================
-- RLS: tables also used by the public booking page (anon)
-- ============================================================
-- These keep anon access as-is (needed by ClientBooking.jsx) and gain a
-- shop-scoped policy for authenticated users.

drop policy if exists "Anon full access barbers" on public.barbers;
create policy "Anon access barbers"
  on public.barbers for all to anon using (true) with check (true);
create policy "Shop access barbers"
  on public.barbers for all to authenticated
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

drop policy if exists "Anon full access services" on public.services;
create policy "Anon access services"
  on public.services for all to anon using (true) with check (true);
create policy "Shop access services"
  on public.services for all to authenticated
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

drop policy if exists "Anon full access bookings" on public.bookings;
create policy "Anon access bookings"
  on public.bookings for all to anon using (true) with check (true);
create policy "Shop access bookings"
  on public.bookings for all to authenticated
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

drop policy if exists "Anon full access shop_settings" on public.shop_settings;
create policy "Anon access shop_settings"
  on public.shop_settings for all to anon using (true) with check (true);
create policy "Shop access shop_settings"
  on public.shop_settings for all to authenticated
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

-- ============================================================
-- RLS: internal-only tables (no anon access in the app)
-- ============================================================

drop policy if exists "Anon full access discounts" on public.discounts;
create policy "Shop access discounts"
  on public.discounts for all to authenticated
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

drop policy if exists "Anon full access products" on public.products;
create policy "Shop access products"
  on public.products for all to authenticated
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

drop policy if exists "Anon full access inventory_adjustments" on public.inventory_adjustments;
create policy "Shop access inventory_adjustments"
  on public.inventory_adjustments for all to authenticated
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

drop policy if exists "Anon full access cash_transactions" on public.cash_transactions;
create policy "Shop access cash_transactions"
  on public.cash_transactions for all to authenticated
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

drop policy if exists "Anon full access payroll_reports" on public.payroll_reports;
create policy "Shop access payroll_reports"
  on public.payroll_reports for all to authenticated
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

drop policy if exists "Anon full access reviews" on public.reviews;
create policy "Shop access reviews"
  on public.reviews for all to authenticated
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

drop policy if exists "Anon full access time_off_requests" on public.time_off_requests;
create policy "Shop access time_off_requests"
  on public.time_off_requests for all to authenticated
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

drop policy if exists "Anon full access barber_passwords" on public.barber_passwords;
create policy "Shop access barber_passwords"
  on public.barber_passwords for all to authenticated
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

drop policy if exists "Anon full access barber_sensitive_info" on public.barber_sensitive_info;
create policy "Shop access barber_sensitive_info"
  on public.barber_sensitive_info for all to authenticated
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

drop policy if exists "Anon full access role_permissions" on public.role_permissions;
create policy "Shop access role_permissions"
  on public.role_permissions for all to authenticated
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

drop policy if exists "Anon full access notifications" on public.notifications;
create policy "Shop access notifications"
  on public.notifications for all to authenticated
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

-- otp_codes: no policy change. RLS is enabled with zero policies, so it's
-- already default-deny for anon/authenticated; only the service role
-- (which bypasses RLS) reads/writes it.

-- ============================================================
-- Tanner's account: set shop_id in auth metadata
-- ============================================================

update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('shop_id', '00000000-0000-0000-0000-000000000001')
where id = '4c89f990-abbe-47a3-b43c-f444bc8016a8';
