-- ─────────────────────────────────────────────────────────────────────────────
-- Affiliate Program — Phase 4: Payout tracking + affiliate-safe commission RPC
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. affiliate_payouts ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid          NOT NULL REFERENCES public.affiliates(id),
  amount       numeric(10,2) NOT NULL CHECK (amount > 0),
  paid_at      date          NOT NULL,
  method       text          NOT NULL,   -- "Venmo", "Check #1234", "Zelle", etc.
  notes        text,
  recorded_by  uuid          REFERENCES auth.users(id),
  created_at   timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- Admin full access — not exposed to affiliates (payout method/notes may include
-- sensitive payment details like account numbers).
CREATE POLICY "affiliate_payouts_admin_all" ON public.affiliate_payouts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
    )
  );


-- ── 2. get_my_affiliate_commission ────────────────────────────────────────────
-- Affiliate-safe wrapper around calculate_affiliate_commission.
-- Uses auth.uid() to scope results to the calling user's own affiliate row,
-- so no affiliate can see another affiliate's commission figures.
CREATE OR REPLACE FUNCTION public.get_my_affiliate_commission(p_month date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  month                   date,
  total_revenue_generated numeric,
  commission_rate_applied numeric,
  commission_amount       numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affiliate_id uuid;
BEGIN
  SELECT id INTO v_affiliate_id
  FROM public.affiliates
  WHERE auth_user_id        = auth.uid()
    AND application_status  = 'approved';

  IF v_affiliate_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.month,
    c.total_revenue_generated,
    c.commission_rate_applied,
    c.commission_amount
  FROM public.calculate_affiliate_commission(v_affiliate_id, p_month) c;
END;
$$;

-- Affiliate portal calls this — explicitly grant to authenticated.
-- calculate_affiliate_commission itself remains revoked from authenticated;
-- only this wrapper (which self-scopes via auth.uid()) is callable.
GRANT EXECUTE ON FUNCTION public.get_my_affiliate_commission(date) TO authenticated;
