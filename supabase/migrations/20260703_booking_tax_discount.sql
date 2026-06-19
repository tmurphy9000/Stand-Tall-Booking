-- Store tax and discount amounts per checkout so the Transactions page
-- can display them as distinct columns (matching Vagaro-style report detail).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS tax_amount  numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;
