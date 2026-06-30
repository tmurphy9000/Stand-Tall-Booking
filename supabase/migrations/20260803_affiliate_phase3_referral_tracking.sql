-- ─────────────────────────────────────────────────────────────────────────────
-- Affiliate Program — Phase 3: Promo code validation RPC
-- ─────────────────────────────────────────────────────────────────────────────
-- validate_affiliate_code: called from the signup flow (anon context) to check
-- whether a code is valid before submitting. Returns a simple boolean so no
-- affiliate PII is ever exposed to the public.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.validate_affiliate_code(p_code text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.affiliates
    WHERE promo_code         = upper(trim(p_code))
      AND application_status = 'approved'
  );
$$;

-- Explicitly grant to anon so it is callable from the unauthenticated signup page.
-- SECURITY DEFINER functions are NOT auto-granted to anon in Supabase.
GRANT EXECUTE ON FUNCTION public.validate_affiliate_code(text) TO anon, authenticated;
