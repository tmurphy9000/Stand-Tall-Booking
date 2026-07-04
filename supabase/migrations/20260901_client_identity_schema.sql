-- Phase 1: Client Identity System — Schema
--
-- Adds is_verified, first_name, last_name to clients.
-- Grandfathers every existing client as verified so they can still book.
-- Adds is_new_client to bookings (auto-set by trigger on first booking).
-- Adds cancellation_policy_hours to shop_settings for machine-readable policy.

-- ── clients ──────────────────────────────────────────────────────────────────

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS first_name  text,
  ADD COLUMN IF NOT EXISTS last_name   text,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- Every client that exists before this migration is treated as verified
-- (they signed up through the old flow which had no formal verification step).
UPDATE public.clients SET is_verified = true WHERE is_verified = false;

-- ── bookings: is_new_client ───────────────────────────────────────────────────

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS is_new_client boolean NOT NULL DEFAULT false;

-- BEFORE INSERT trigger: mark the booking is_new_client = true when this is
-- the first booking ever for this client_id.
CREATE OR REPLACE FUNCTION public.set_is_new_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fires when client_id is supplied (online bookings with verified clients).
  -- The BEFORE trigger runs before the row is inserted, so a count of 0 means
  -- this will be their first booking.
  IF NEW.client_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.bookings WHERE client_id = NEW.client_id LIMIT 1
    ) THEN
      NEW.is_new_client := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_is_new_client ON public.bookings;
CREATE TRIGGER trg_set_is_new_client
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_is_new_client();

-- ── shop_settings: machine-readable cancellation window ──────────────────────

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS cancellation_policy_hours integer;
