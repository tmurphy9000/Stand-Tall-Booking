-- Online deposit system
-- Adds deposit configuration to shop_settings, a per-client deposit flag,
-- and deposit tracking columns to bookings.

alter table public.shop_settings
  add column if not exists deposit_enabled         boolean not null default false,
  add column if not exists deposit_percentage      integer not null default 20,
  add column if not exists deposit_refund_hours    integer not null default 24,
  add column if not exists deposit_pretip_enabled  boolean not null default false;

alter table public.clients
  add column if not exists deposit_required boolean not null default false;

alter table public.bookings
  add column if not exists deposit_amount_paid   integer,            -- cents; null = no deposit collected
  add column if not exists deposit_refund_status text not null default 'none'; -- none | refunded | forfeited
