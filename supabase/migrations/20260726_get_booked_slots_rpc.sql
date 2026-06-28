-- Close the remaining C-2 PII exposure: anon SELECT on bookings exposes
-- client_name, client_phone, client_id, and deposit_payment_intent_id for
-- every booking in every shop.
--
-- The booking page only needs time-slot availability data (barber_id,
-- start_time, duration, status) — no client PII. Replace the broad anon
-- SELECT policy with a SECURITY DEFINER function scoped to one shop + date.
--
-- Important: dropping bookings_anon_select also closes the attack vector
-- against the C-5 fix — previously anon could harvest client_id values from
-- the bookings table and use them to cancel other customers' appointments
-- via stripe-refund-deposit's guest ownership check.

CREATE OR REPLACE FUNCTION public.get_booked_slots(p_shop_id uuid, p_date date)
RETURNS TABLE(barber_id uuid, start_time text, duration integer, status text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.barber_id, b.start_time, b.duration, b.status
  FROM bookings b
  WHERE b.shop_id = p_shop_id
    AND b.date = p_date
    AND b.status <> 'cancelled'
$$;

GRANT EXECUTE ON FUNCTION public.get_booked_slots(uuid, date) TO anon;
GRANT EXECUTE ON FUNCTION public.get_booked_slots(uuid, date) TO authenticated;

-- Drop the broad anon SELECT that exposed all booking columns to anyone.
-- The get_booked_slots RPC replaces it for the booking page's availability checks.
DROP POLICY IF EXISTS "bookings_anon_select" ON public.bookings;
