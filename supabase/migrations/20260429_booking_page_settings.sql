-- Booking page settings columns on shop_settings
alter table public.shop_settings
  add column if not exists max_booking_days_ahead integer default 60,
  add column if not exists booking_logo_url        text,
  add column if not exists shop_name               text,
  add column if not exists shop_address            text,
  add column if not exists shop_phone              text,
  add column if not exists shop_email              text,
  add column if not exists social_links            jsonb default '{}'::jsonb;
