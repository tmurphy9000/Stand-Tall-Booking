-- Add url_slug to shops for multi-tenant public booking URLs.
-- Each shop gets a unique slug used in /book/:shopSlug.

alter table public.shops
  add column if not exists url_slug text;

-- Backfill existing shops: sanitize name → slug + 8-char ID suffix for uniqueness
update public.shops
set url_slug =
  regexp_replace(
    lower(regexp_replace(name, '[^a-zA-Z0-9 ]', '', 'g')),
    '\s+', '-', 'g'
  ) || '-' || left(id::text, 8)
where url_slug is null;

-- Ensure every row has a slug, then lock it down
alter table public.shops
  alter column url_slug set not null;

alter table public.shops
  drop constraint if exists shops_url_slug_unique;

alter table public.shops
  add constraint shops_url_slug_unique unique (url_slug);

create index if not exists shops_url_slug_idx on public.shops (url_slug);
