-- The public booking page (/book/:shopSlug) runs as an unauthenticated
-- (anon) Supabase client and must be able to SELECT from the shops table
-- to resolve the shop by its url_slug.
--
-- RLS is already enabled on shops.  Earlier migrations may or may not have
-- created an anon-read policy depending on which migrations reached the
-- production database.  This migration idempotently ensures that at least a
-- SELECT policy for the anon role exists, regardless of prior state.

drop policy if exists "Anon read shops" on public.shops;

create policy "Anon read shops"
  on public.shops
  for select
  to anon
  using (true);
