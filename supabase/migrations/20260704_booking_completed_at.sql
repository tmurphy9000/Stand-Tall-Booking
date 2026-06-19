-- Track when a booking was actually checked out so the Transactions page
-- can filter by transaction date rather than appointment date.
-- (A barber may check out a booking scheduled for tomorrow, or carry over
-- a yesterday booking — appointment date != transaction date.)

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;
