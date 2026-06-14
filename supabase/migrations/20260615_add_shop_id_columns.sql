-- Multi-tenancy Phase 1: add a nullable shop_id column to every remaining
-- table so existing rows keep working while new rows can be tagged with
-- their owning shop. RLS policies are intentionally left unchanged for now
-- (Phase 2 will backfill data and enforce shop_id in policies).

alter table public.barbers
  add column if not exists shop_id uuid references public.shops(id);

alter table public.services
  add column if not exists shop_id uuid references public.shops(id);

alter table public.bookings
  add column if not exists shop_id uuid references public.shops(id);

alter table public.shop_settings
  add column if not exists shop_id uuid references public.shops(id);

alter table public.discounts
  add column if not exists shop_id uuid references public.shops(id);

alter table public.products
  add column if not exists shop_id uuid references public.shops(id);

alter table public.inventory_adjustments
  add column if not exists shop_id uuid references public.shops(id);

alter table public.cash_transactions
  add column if not exists shop_id uuid references public.shops(id);

alter table public.payroll_reports
  add column if not exists shop_id uuid references public.shops(id);

alter table public.reviews
  add column if not exists shop_id uuid references public.shops(id);

alter table public.time_off_requests
  add column if not exists shop_id uuid references public.shops(id);

alter table public.barber_passwords
  add column if not exists shop_id uuid references public.shops(id);

alter table public.barber_sensitive_info
  add column if not exists shop_id uuid references public.shops(id);

alter table public.role_permissions
  add column if not exists shop_id uuid references public.shops(id);

alter table public.notifications
  add column if not exists shop_id uuid references public.shops(id);

alter table public.otp_codes
  add column if not exists shop_id uuid references public.shops(id);

alter table public.subscriptions
  add column if not exists shop_id uuid references public.shops(id);
