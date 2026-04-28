-- Visibility toggles for shop phone and email on the public booking page
alter table public.shop_settings
  add column if not exists show_shop_phone boolean default true,
  add column if not exists show_shop_email boolean default true;
