-- Medium-severity RLS fixes: M-1, M-2, M-3, M-4, M-5
-- Also bundles H-series DB changes (20260728 + 20260729) that were committed
-- but never applied due to supabase db push version-collision failures.
-- All applied directly via supabase db query --linked.

-- ════════════════════════════════════════════════════════════════════════════════
-- H-SERIES (pending from previous batch)
-- ════════════════════════════════════════════════════════════════════════════════

-- ── H-1: shops UPDATE ──────────────────────────────────────────────────────────
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

-- ── H-1 completion: drop the "Anon full access shops" ALL policy ───────────────
DROP POLICY IF EXISTS "Anon full access shops" ON public.shops;

-- ── H-2: services anon ALL → SELECT only ──────────────────────────────────────
DROP POLICY IF EXISTS "Anon access services" ON public.services;

CREATE POLICY "services_anon_select"
  ON public.services FOR SELECT TO anon
  USING (true);

-- ── H-4: marketing_campaigns — scope to current shop ──────────────────────────
DROP POLICY IF EXISTS "marketing_campaigns_authenticated_all" ON public.marketing_campaigns;

CREATE POLICY "marketing_campaigns_shop_scope"
  ON public.marketing_campaigns FOR ALL TO authenticated
  USING     (shop_id = public.current_shop_id())
  WITH CHECK (shop_id = public.current_shop_id());

-- ── H-4: campaign_sends — scope via parent campaign ───────────────────────────
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

-- ── H-5: promo_codes — scope to current shop ──────────────────────────────────
DROP POLICY IF EXISTS "promo_codes_authenticated_all" ON public.promo_codes;

CREATE POLICY "promo_codes_shop_scope"
  ON public.promo_codes FOR ALL TO authenticated
  USING     (shop_id = public.current_shop_id())
  WITH CHECK (shop_id = public.current_shop_id());

-- ── H-6: gusto_connections — restrict tokens to admin roles ───────────────────
DROP POLICY IF EXISTS "Shop members can read gusto connection"  ON public.gusto_connections;
DROP POLICY IF EXISTS "Shop owner can manage gusto connection"  ON public.gusto_connections;

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

-- ════════════════════════════════════════════════════════════════════════════════
-- M-SERIES
-- ════════════════════════════════════════════════════════════════════════════════

-- ── M-1: admin_activity_log — add superadmin to SELECT ────────────────────────
-- Previously only 'owner' could read the log; superadmin was excluded.
DROP POLICY IF EXISTS "owner_select_activity_log" ON public.admin_activity_log;

CREATE POLICY "owner_select_activity_log"
  ON public.admin_activity_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner', 'superadmin')
    )
  );

-- ── M-2: signup_attempts DELETE — add owner ────────────────────────────────────
-- Superadmin-only DELETE excluded owners. Matches the SELECT policy.
DROP POLICY IF EXISTS "signup_attempts_delete_superadmin" ON public.signup_attempts;

CREATE POLICY "signup_attempts_delete_admin"
  ON public.signup_attempts FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner', 'superadmin')
    )
  );

-- ── M-3: barber_passwords — restrict cross-barber read/write ──────────────────
-- "Shop access barber_passwords" (ALL, shop_id only) let any barber read any
-- other barber's password_hash. Fix: own record + admin reads/updates; INSERT/DELETE
-- admin only.
DROP POLICY IF EXISTS "Shop access barber_passwords" ON public.barber_passwords;

CREATE POLICY "barber_passwords_select"
  ON public.barber_passwords FOR SELECT TO authenticated
  USING (
    shop_id = public.current_shop_id()
    AND (
      barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1)
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level IN ('owner', 'manager', 'superadmin')
      )
    )
  );

CREATE POLICY "barber_passwords_update"
  ON public.barber_passwords FOR UPDATE TO authenticated
  USING (
    shop_id = public.current_shop_id()
    AND (
      barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1)
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level IN ('owner', 'manager', 'superadmin')
      )
    )
  )
  WITH CHECK (
    shop_id = public.current_shop_id()
    AND (
      barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1)
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level IN ('owner', 'manager', 'superadmin')
      )
    )
  );

CREATE POLICY "barber_passwords_insert"
  ON public.barber_passwords FOR INSERT TO authenticated
  WITH CHECK (
    shop_id = public.current_shop_id()
    AND EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner', 'manager', 'superadmin')
    )
  );

CREATE POLICY "barber_passwords_delete"
  ON public.barber_passwords FOR DELETE TO authenticated
  USING (
    shop_id = public.current_shop_id()
    AND EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner', 'manager', 'superadmin')
    )
  );

-- ── M-4: role_permissions — restrict writes to owner/superadmin ───────────────
-- "Shop access role_permissions" (ALL, shop_id only) let any barber modify the
-- permission table that governs their own role.
-- Fix: SELECT for all shop members (UI display), writes owner/superadmin only.
DROP POLICY IF EXISTS "Shop access role_permissions" ON public.role_permissions;

CREATE POLICY "role_permissions_select"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (shop_id = public.current_shop_id());

CREATE POLICY "role_permissions_insert"
  ON public.role_permissions FOR INSERT TO authenticated
  WITH CHECK (
    shop_id = public.current_shop_id()
    AND EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner', 'superadmin')
    )
  );

CREATE POLICY "role_permissions_update"
  ON public.role_permissions FOR UPDATE TO authenticated
  USING (
    shop_id = public.current_shop_id()
    AND EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner', 'superadmin')
    )
  )
  WITH CHECK (
    shop_id = public.current_shop_id()
    AND EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner', 'superadmin')
    )
  );

CREATE POLICY "role_permissions_delete"
  ON public.role_permissions FOR DELETE TO authenticated
  USING (
    shop_id = public.current_shop_id()
    AND EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner', 'superadmin')
    )
  );

-- ── M-5: shop_settings — ALL policy made owner-only UPDATE a no-op ────────────
-- "Shop access shop_settings" (ALL, any shop member) + permissive OR means the
-- "Shop owner can update shop_settings" (UPDATE, owner-scoped) was never enforced.
-- Fix: SELECT stays open to shop members; writes restricted to owner/manager/superadmin.
DROP POLICY IF EXISTS "Shop access shop_settings"          ON public.shop_settings;
DROP POLICY IF EXISTS "Shop owner can update shop_settings" ON public.shop_settings;

CREATE POLICY "shop_settings_select"
  ON public.shop_settings FOR SELECT TO authenticated
  USING (shop_id = public.current_shop_id());

CREATE POLICY "shop_settings_insert"
  ON public.shop_settings FOR INSERT TO authenticated
  WITH CHECK (
    shop_id = public.current_shop_id()
    AND EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner', 'manager', 'superadmin')
    )
  );

CREATE POLICY "shop_settings_update"
  ON public.shop_settings FOR UPDATE TO authenticated
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

CREATE POLICY "shop_settings_delete"
  ON public.shop_settings FOR DELETE TO authenticated
  USING (
    shop_id = public.current_shop_id()
    AND EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner', 'manager', 'superadmin')
    )
  );
