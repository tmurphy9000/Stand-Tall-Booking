-- Ensure bookings_blocked column exists on barbers.
-- This column was defined in schema.sql but never added via a migration,
-- so production databases set up from migrations alone may be missing it.
-- The Block All Bookings toggle in barber settings writes to this column,
-- and the public booking page must filter it out.

alter table public.barbers
  add column if not exists bookings_blocked boolean not null default false;
