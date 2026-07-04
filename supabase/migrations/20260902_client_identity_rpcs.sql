-- Phase 1: Client Identity System — RPCs
--
-- lookup_verified_client: find a verified client by phone in a shop (no OTP needed).
-- upsert_verified_client: create or update a client, mark is_verified = true.
--   Called after a successful OTP for first-time clients.

-- ── lookup_verified_client ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.lookup_verified_client(
  p_shop_id uuid,
  p_phone   text
)
RETURNS TABLE(
  id         uuid,
  first_name text,
  last_name  text,
  name       text,
  email      text,
  phone      text,
  sms_opt_in boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
BEGIN
  RETURN QUERY
  SELECT c.id, c.first_name, c.last_name, c.name, c.email, c.phone, c.sms_opt_in
  FROM clients c
  WHERE c.shop_id = p_shop_id
    AND c.is_verified = true
    AND regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') = v_phone
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_verified_client(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_verified_client(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.lookup_verified_client(uuid, text) TO authenticated;

-- ── upsert_verified_client ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.upsert_verified_client(
  p_shop_id    uuid,
  p_phone      text,
  p_first_name text,
  p_last_name  text,
  p_email      text    DEFAULT NULL,
  p_sms_opt_in boolean DEFAULT true
)
RETURNS TABLE(id uuid, is_verified boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_name  text := trim(coalesce(p_first_name, '') || ' ' || coalesce(p_last_name, ''));
  v_id    uuid;
BEGIN
  -- Try to find existing client in this shop by normalized phone
  SELECT c.id INTO v_id
  FROM clients c
  WHERE c.shop_id = p_shop_id
    AND regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') = v_phone
  LIMIT 1;

  IF FOUND THEN
    UPDATE clients SET
      first_name  = p_first_name,
      last_name   = p_last_name,
      name        = v_name,
      email       = COALESCE(p_email, email),
      sms_opt_in  = p_sms_opt_in,
      is_verified = true
    WHERE id = v_id;
  ELSE
    INSERT INTO clients (shop_id, phone, first_name, last_name, name, email, sms_opt_in, is_verified)
    VALUES (p_shop_id, p_phone, p_first_name, p_last_name, v_name, p_email, p_sms_opt_in, true)
    RETURNING clients.id INTO v_id;
  END IF;

  RETURN QUERY SELECT v_id, true::boolean;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_verified_client(uuid, text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_verified_client(uuid, text, text, text, text, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_verified_client(uuid, text, text, text, text, boolean) TO authenticated;
