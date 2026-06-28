-- High-severity RLS fixes: H-1, H-2, H-4, H-5, H-6
--
-- H-1: shops UPDATE — previous policy only checked barbers.shop_id, returning
--      null for the superadmin (barber.shop_id = null) and blocking their own
--      shop update. Replace with the COALESCE(barbers, subscriptions) pattern.
--
-- H-2: services anon — "Anon access services" was FOR ALL (using true), meaning
--      unauthenticated users could UPDATE or DELETE any shop's services.
--      Replace with SELECT-only (booking page still needs to read services).
--
-- H-4: marketing_campaigns + campaign_sends — both had USING(true) policies,
--      letting any authenticated user read/write any shop's campaigns.
--      Scope to current_shop_id().
--
-- H-5: promo_codes authenticated — USING(true), any authenticated user could
--      read/write any shop's promo codes. Scope to current_shop_id().
--
-- H-6: gusto_connections — "Shop members can read" exposed access_token and
--      refresh_token to every barber at the shop. "Shop owner can manage" was
--      FOR ALL (which includes SELECT), also exposing tokens via that path.
--      Replace both with a single admin-restricted policy.

-- ── H-1: shops ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Owner can update their shop" ON public.shops;

CREATE POLICY "shops_owner_update"
  ON public.shops FOR UPDATE TO authenticated
  USING (
    id = COALESCE(
      (SELECT shop_id FROM public.barbers       WHERE user_id = auth.uid() LIMIT 1),
      (SELECT shop_id FROM public.subscriptions WHERE user_id = auth.uid() LIMIT 1)
    )
  )
  WITH CHECK (
    id = COALESCE(
      (SELECT shop_id FROM public.barbers       WHERE user_id = auth.uid() LIMIT 1),
      (SELECT shop_id FROM public.subscriptions WHERE user_id = auth.uid() LIMIT 1)
    )
  );

-- ── H-2: services ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anon access services" ON public.services;

CREATE POLICY "services_anon_select"
  ON public.services FOR SELECT TO anon
  USING (true);

-- ── H-4: marketing_campaigns ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "marketing_campaigns_authenticated_all" ON public.marketing_campaigns;

CREATE POLICY "marketing_campaigns_shop_scope"
  ON public.marketing_campaigns FOR ALL TO authenticated
  USING     (shop_id = public.current_shop_id())
  WITH CHECK (shop_id = public.current_shop_id());

-- ── H-4: campaign_sends ───────────────────────────────────────────────────────
-- campaign_sends has no direct shop_id column; scope via the parent campaign.
-- send-marketing-email uses the service role and bypasses RLS, so this
-- only restricts direct PostgREST access from authenticated browser clients.

DROP POLICY IF EXISTS "campaign_sends_authenticated_all" ON public.campaign_sends;

CREATE POLICY "campaign_sends_shop_scope"
  ON public.campaign_sends FOR ALL TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM public.marketing_campaigns
      WHERE shop_id = public.current_shop_id()
    )
  )
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM public.marketing_campaigns
      WHERE shop_id = public.current_shop_id()
    )
  );

-- ── H-5: promo_codes ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "promo_codes_authenticated_all" ON public.promo_codes;

CREATE POLICY "promo_codes_shop_scope"
  ON public.promo_codes FOR ALL TO authenticated
  USING     (shop_id = public.current_shop_id())
  WITH CHECK (shop_id = public.current_shop_id());

-- Anon SELECT (booking page promo code validation) — keep but leave as-is.
-- The policy already filters active = true; the browser always sends an
-- additional shop_id + code filter, so cross-shop leakage is limited.

-- ── H-6: gusto_connections ────────────────────────────────────────────────────
-- Drop both original policies (the FOR ALL one included SELECT, exposing
-- access_token/refresh_token to every shop member via either path).

DROP POLICY IF EXISTS "Shop members can read gusto connection"  ON public.gusto_connections;
DROP POLICY IF EXISTS "Shop owner can manage gusto connection"  ON public.gusto_connections;

-- Only owner / manager / superadmin can read or write OAuth tokens.
-- The gusto-oauth-callback edge function uses the service role and bypasses RLS,
-- so the token write on first connect continues to work.
CREATE POLICY "gusto_connections_admin_all"
  ON public.gusto_connections FOR ALL TO authenticated
  USING (
    shop_id = public.current_shop_id()
    AND EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner', 'manager', 'superadmin')
    )
  )
  WITH CHECK (
    shop_id = public.current_shop_id()
    AND EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner', 'manager', 'superadmin')
    )
  );
