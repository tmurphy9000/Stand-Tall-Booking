-- Replace broad anon SELECT/INSERT policies on clients with a SECURITY DEFINER
-- function that scopes all anon client access to a specific shop_id parameter.
-- Anon users can no longer read or enumerate the clients table directly.
--
-- find_or_create_client behavior:
--   p_name IS NULL  → lookup-only: returns the matching row, or empty if none found
--   p_name IS NOT NULL → find-or-create: returns matching row, or inserts and returns new row
--
-- Phone matching is digit-normalized (strips all non-digit characters).

DROP POLICY IF EXISTS "clients_anon_select" ON public.clients;
DROP POLICY IF EXISTS "clients_anon_insert" ON public.clients;

CREATE OR REPLACE FUNCTION public.find_or_create_client(
  p_shop_id    uuid,
  p_phone      text DEFAULT NULL,
  p_email      text DEFAULT NULL,
  p_name       text DEFAULT NULL,
  p_sms_opt_in boolean DEFAULT false
)
RETURNS TABLE(id uuid, deposit_required boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_id    uuid;
  v_dep   boolean;
BEGIN
  -- Try to find existing client in this shop by normalized phone OR email
  SELECT c.id, c.deposit_required
    INTO v_id, v_dep
    FROM clients c
   WHERE c.shop_id = p_shop_id
     AND (
       (v_phone <> '' AND regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') = v_phone)
       OR (p_email IS NOT NULL AND lower(coalesce(c.email, '')) = lower(p_email))
     )
   LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT v_id, v_dep;
    RETURN;
  END IF;

  -- Lookup-only mode: return empty set
  IF p_name IS NULL THEN
    RETURN;
  END IF;

  -- Create the client and return the new row
  INSERT INTO clients (shop_id, name, phone, email, sms_opt_in)
  VALUES (p_shop_id, p_name, p_phone, p_email, p_sms_opt_in)
  RETURNING clients.id, clients.deposit_required
  INTO v_id, v_dep;

  RETURN QUERY SELECT v_id, v_dep;
END;
$$;

-- Anon must be able to call this function (it replaces direct table access)
GRANT EXECUTE ON FUNCTION public.find_or_create_client(uuid, text, text, text, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.find_or_create_client(uuid, text, text, text, boolean) TO authenticated;
