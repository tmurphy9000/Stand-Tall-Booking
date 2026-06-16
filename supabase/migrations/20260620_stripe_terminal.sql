alter table public.shops
  add column if not exists stripe_terminal_location_id text;
