alter table public.shop_settings
  add column if not exists cancellation_policy_enabled boolean default false,
  add column if not exists cancellation_policy_text    text;
