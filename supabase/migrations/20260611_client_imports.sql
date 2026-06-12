-- Shops table: lays the groundwork for multi-tenancy. A single default shop
-- is seeded so existing data and new imports have a shop_id to reference.
create table if not exists public.shops (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  created_at timestamptz default now()
);

insert into public.shops (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Stand Tall Barbershop')
on conflict (id) do nothing;

alter table public.clients
  add column if not exists shop_id uuid references public.shops(id) default '00000000-0000-0000-0000-000000000001';

update public.clients set shop_id = '00000000-0000-0000-0000-000000000001' where shop_id is null;

-- Background client import jobs
create table if not exists public.client_imports (
  id               uuid primary key default uuid_generate_v4(),
  shop_id          uuid not null references public.shops(id),
  file_path        text not null,
  file_name        text,
  status           text not null default 'pending',
  total_clients    integer not null default 0,
  imported_clients integer not null default 0,
  error            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table public.shops enable row level security;
alter table public.client_imports enable row level security;

create policy "Anon full access shops"
  on public.shops for all to anon, authenticated using (true) with check (true);

create policy "Anon full access client_imports"
  on public.client_imports for all to anon, authenticated using (true) with check (true);

-- Storage bucket for uploaded import files
insert into storage.buckets (id, name, public)
values ('client-imports', 'client-imports', false)
on conflict (id) do nothing;

create policy "Anon full access client-imports storage"
  on storage.objects for all to anon, authenticated
  using (bucket_id = 'client-imports')
  with check (bucket_id = 'client-imports');
