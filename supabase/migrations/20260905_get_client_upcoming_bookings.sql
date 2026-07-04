-- Phase 3: Upcoming bookings RPC for the inline appointment summary.
-- Returns future, non-cancelled bookings for a client identified by phone + shop.
-- SECURITY DEFINER + phone-scoped so anon callers cannot enumerate other clients.

CREATE OR REPLACE FUNCTION public.get_client_upcoming_bookings(
  p_shop_id uuid,
  p_phone   text
)
RETURNS TABLE(
  id           uuid,
  date         date,
  start_time   text,
  end_time     text,
  service_name text,
  barber_name  text,
  status       text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone     text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_client_id uuid;
BEGIN
  SELECT c.id INTO v_client_id
  FROM clients c
  WHERE c.shop_id = p_shop_id
    AND regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') = v_phone
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT b.id, b.date, b.start_time, b.end_time, b.service_name, b.barber_name, b.status
  FROM bookings b
  WHERE b.shop_id = p_shop_id
    AND b.client_id = v_client_id
    AND b.date >= CURRENT_DATE
    AND b.status != 'cancelled'
  ORDER BY b.date, b.start_time;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_upcoming_bookings(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_upcoming_bookings(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_upcoming_bookings(uuid, text) TO authenticated;
