-- Track whether a 24h reminder SMS has been sent for each booking.
-- NULL = not yet sent (or not applicable). Set to now() after send attempt.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reminder_sms_sent_at timestamptz;
