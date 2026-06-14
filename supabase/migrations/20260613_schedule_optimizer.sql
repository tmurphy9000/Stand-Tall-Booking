-- Schedule Optimizer toggle on shop_settings
alter table public.shop_settings
  add column if not exists schedule_optimizer_enabled boolean default true;
