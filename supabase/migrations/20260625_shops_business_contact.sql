-- Add business contact fields to the shops table.
-- These are distinct from any personal/account contact info and are the
-- only phone/email shown on the public booking page.  Both are optional —
-- a null value means "don't show anything on the booking page."

alter table public.shops
  add column if not exists business_phone text,
  add column if not exists business_email text;
