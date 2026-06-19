ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS product_names text;
