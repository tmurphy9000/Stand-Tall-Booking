-- Fix commission calculation: use actual subscription tier names ('basic'/'pro'/'elite')
-- The Phase 1 migration incorrectly used 'starter'/'premium' which don't match
-- the values written by stripe-webhook (basic/pro/elite).

CREATE OR REPLACE FUNCTION public.calculate_affiliate_commission(
  p_affiliate_id uuid,
  p_month        date
)
RETURNS TABLE (
  affiliate_id            uuid,
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
  v_month_start  date    := date_trunc('month', p_month)::date;
  v_month_end    date    := (date_trunc('month', p_month) + interval '1 month')::date;
  v_revenue      numeric := 0;
  v_rate         numeric;
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN s.tier = 'basic'  THEN 29
      WHEN s.tier = 'pro'    THEN 79
      WHEN s.tier = 'elite'  THEN 149
      ELSE 0
    END
  ), 0)
  INTO v_revenue
  FROM public.affiliate_referrals ar
  JOIN public.subscriptions s ON s.shop_id = ar.shop_id
  WHERE ar.affiliate_id = p_affiliate_id
    AND ar.signed_up_at              < v_month_end
    AND ar.commission_window_ends_at > v_month_start
    AND s.status IN ('active', 'trialing');

  v_rate := CASE
    WHEN v_revenue < 300   THEN 0.10
    WHEN v_revenue < 800   THEN 0.20
    WHEN v_revenue < 2000  THEN 0.30
    WHEN v_revenue < 5000  THEN 0.40
    ELSE                        0.50
  END;

  RETURN QUERY SELECT
    p_affiliate_id,
    v_month_start,
    v_revenue,
    v_rate,
    round(v_revenue * v_rate, 2);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.calculate_affiliate_commission(uuid, date)
  FROM anon, authenticated;
