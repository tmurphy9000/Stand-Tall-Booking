-- Phase 5: link bookings to promo codes and auto-maintain use_count.
--
-- Adds promo_code_id FK to bookings. A SECURITY DEFINER trigger handles
-- use_count increments so both anon (public booking page) and authenticated
-- (staff checkout) paths work without needing explicit UPDATE access on
-- promo_codes from those roles.
--
-- The trigger fires on:
--   INSERT — new booking created with a promo code (QuickCheckout, public booking)
--   UPDATE OF promo_code_id — existing booking gets a code applied at checkout
--     (CheckoutModal) and the column changes from NULL to a value.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS promo_code_id uuid REFERENCES public.promo_codes(id);

CREATE OR REPLACE FUNCTION public.handle_promo_code_use_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.promo_code_id IS NOT NULL THEN
    UPDATE public.promo_codes
      SET use_count = use_count + 1
      WHERE id = NEW.promo_code_id;

  ELSIF TG_OP = 'UPDATE'
    AND NEW.promo_code_id IS NOT NULL
    AND (OLD.promo_code_id IS NULL OR OLD.promo_code_id <> NEW.promo_code_id)
  THEN
    UPDATE public.promo_codes
      SET use_count = use_count + 1
      WHERE id = NEW.promo_code_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Fires only when promo_code_id is part of the change (UPDATE OF promo_code_id)
-- so normal booking status updates don't trigger an unnecessary function call.
CREATE TRIGGER trg_booking_promo_use_count
  AFTER INSERT OR UPDATE OF promo_code_id ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_promo_code_use_count();
