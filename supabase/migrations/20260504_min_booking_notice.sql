alter table public.shop_settings
  add column if not exists min_booking_notice_minutes integer default 0;
