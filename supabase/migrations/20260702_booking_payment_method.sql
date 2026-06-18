-- Add payment tracking fields to bookings so the Transactions page
-- can display payment method and enable Stripe refunds.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
