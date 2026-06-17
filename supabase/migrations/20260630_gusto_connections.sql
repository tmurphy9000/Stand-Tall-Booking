-- Stores Gusto OAuth tokens per shop.
--
-- Kept in its own table (not shop_settings) because shop_settings has an
-- anon SELECT policy for the client booking page, which would expose tokens
-- to unauthenticated requests.  Access here is restricted to authenticated
-- shop members for SELECT and owners/admins for write operations.

create table if not exists public.gusto_connections (
  id              uuid primary key default gen_random_uuid(),
  shop_id         uuid not null references public.shops(id) on delete cascade,
  access_token    text not null,
  refresh_token   text not null,
  company_uuid    text,
  company_name    text,
  connected_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint gusto_connections_shop_id_key unique (shop_id)
);

alter table public.gusto_connections enable row level security;

-- Authenticated shop members can read their own shop's connection status
create policy "Shop members can read gusto connection"
  on public.gusto_connections for select
  to authenticated
  using (
    shop_id = coalesce(
      (select shop_id from public.barbers      where user_id = auth.uid() limit 1),
      (select shop_id from public.subscriptions where user_id = auth.uid() limit 1)
    )
  );

-- Shop owners/admins can write (insert/update/delete)
create policy "Shop owner can manage gusto connection"
  on public.gusto_connections for all
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
