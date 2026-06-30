-- ============================================================
-- Access Level System: Phase 1
-- Creates access_levels + access_level_permissions tables,
-- adds access_level_id to barbers, seeds 3 default levels per
-- shop with full permission matrices, backfills barbers, and
-- adds a SECURITY DEFINER helper for future RLS use in Phase 4.
-- ============================================================

-- ─── Tables ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.access_levels (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id                 uuid        NOT NULL DEFAULT public.current_shop_id(),
  name                    text        NOT NULL,
  description             text,
  is_default              boolean     NOT NULL DEFAULT false,
  is_active               boolean     NOT NULL DEFAULT true,
  legacy_permission_level text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.access_level_permissions (
  id               uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  access_level_id  uuid  NOT NULL REFERENCES public.access_levels(id) ON DELETE CASCADE,
  permission_key   text  NOT NULL,
  permission_value text  NOT NULL DEFAULT 'none'
                         CHECK (permission_value IN ('none','view','modify','modify_with_limit')),
  limit_value      numeric,
  location_id      uuid,
  CONSTRAINT unique_alp UNIQUE (access_level_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_alp_level_key
  ON public.access_level_permissions (access_level_id, permission_key);

-- ─── barbers: add access_level_id ───────────────────────────

ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS access_level_id uuid REFERENCES public.access_levels(id) ON DELETE SET NULL;

-- ─── RLS ─────────────────────────────────────────────────────

ALTER TABLE public.access_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_level_permissions ENABLE ROW LEVEL SECURITY;

-- access_levels: all authenticated users in the shop can read
CREATE POLICY "access_levels_select"
  ON public.access_levels FOR SELECT
  TO authenticated
  USING (shop_id = public.current_shop_id());

-- access_levels: owners/managers can insert
CREATE POLICY "access_levels_insert"
  ON public.access_levels FOR INSERT
  TO authenticated
  WITH CHECK (
    shop_id = public.current_shop_id()
    AND EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner', 'manager', 'superadmin')
    )
  );

-- access_levels: owners/managers can update
CREATE POLICY "access_levels_update"
  ON public.access_levels FOR UPDATE
  TO authenticated
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

-- access_levels: owners (and superadmin) only can delete — manager is intentionally excluded.
-- Rationale: deleting an access level affects every barber assigned to it and is a structural
-- change to the shop's role hierarchy. Managers can create and edit custom access levels
-- (INSERT/UPDATE above) but owner sign-off is required before any level is removed.
-- The is_default = false guard already prevents deleting the three built-in defaults;
-- this restriction applies to custom levels too.
CREATE POLICY "access_levels_delete"
  ON public.access_levels FOR DELETE
  TO authenticated
  USING (
    shop_id = public.current_shop_id()
    AND is_default = false
    AND EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner', 'superadmin')
    )
  );

-- access_level_permissions: readable by all authenticated users (needed for permission loading)
CREATE POLICY "alp_select"
  ON public.access_level_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.access_levels al
      WHERE al.id = access_level_id
        AND al.shop_id = public.current_shop_id()
    )
  );

-- access_level_permissions: owners/managers can write
CREATE POLICY "alp_insert"
  ON public.access_level_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.access_levels al
      JOIN public.barbers b ON b.user_id = auth.uid()
      WHERE al.id = access_level_id
        AND al.shop_id = b.shop_id
        AND b.permission_level IN ('owner', 'manager', 'superadmin')
    )
  );

CREATE POLICY "alp_update"
  ON public.access_level_permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.access_levels al
      JOIN public.barbers b ON b.user_id = auth.uid()
      WHERE al.id = access_level_id
        AND al.shop_id = b.shop_id
        AND b.permission_level IN ('owner', 'manager', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.access_levels al
      JOIN public.barbers b ON b.user_id = auth.uid()
      WHERE al.id = access_level_id
        AND al.shop_id = b.shop_id
        AND b.permission_level IN ('owner', 'manager', 'superadmin')
    )
  );

CREATE POLICY "alp_delete"
  ON public.access_level_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.access_levels al
      JOIN public.barbers b ON b.user_id = auth.uid()
      WHERE al.id = access_level_id
        AND al.shop_id = b.shop_id
        AND b.permission_level IN ('owner', 'manager', 'superadmin')
    )
  );

-- ─── Seed default access levels per shop + backfill barbers ──

DO $$
DECLARE
  v_shop_id  uuid;
  owner_id   uuid;
  mgr_id     uuid;
  sp_id      uuid;
BEGIN
  FOR v_shop_id IN SELECT DISTINCT shop_id FROM public.barbers WHERE shop_id IS NOT NULL LOOP

    -- Insert the three default levels if they don't exist yet
    INSERT INTO public.access_levels (shop_id, name, description, is_default, is_active, legacy_permission_level)
    VALUES
      (v_shop_id, 'Owner',            'Full access to all features and settings',                    true, true, 'owner'),
      (v_shop_id, 'Manager',          'Manage daily operations, staff, clients, and reports',        true, true, 'manager'),
      (v_shop_id, 'Service Provider', 'Basic access: own calendar, own reports, own time-off',       true, true, 'service_provider')
    ON CONFLICT DO NOTHING;

    SELECT id INTO owner_id FROM public.access_levels
      WHERE shop_id = v_shop_id AND legacy_permission_level = 'owner' LIMIT 1;
    SELECT id INTO mgr_id FROM public.access_levels
      WHERE shop_id = v_shop_id AND legacy_permission_level = 'manager' LIMIT 1;
    SELECT id INTO sp_id FROM public.access_levels
      WHERE shop_id = v_shop_id AND legacy_permission_level = 'service_provider' LIMIT 1;

    -- ── Owner permissions (modify everything) ─────────────────
    INSERT INTO public.access_level_permissions (access_level_id, permission_key, permission_value)
    VALUES
      (owner_id, 'calendar.configuration',              'modify'),
      (owner_id, 'calendar.control_own',                'modify'),
      (owner_id, 'calendar.control_others',             'modify'),
      (owner_id, 'calendar.accept_own_appointments',    'modify'),
      (owner_id, 'calendar.accept_others_appointments', 'modify'),
      (owner_id, 'checkout.customer_checkout',          'modify'),
      (owner_id, 'checkout.undo_checkout',              'modify'),
      (owner_id, 'checkout.modify_price_discount',      'modify'),
      (owner_id, 'checkout.taxes',                      'modify'),
      (owner_id, 'checkout.refunds',                    'modify'),
      (owner_id, 'clients.management',                  'modify'),
      (owner_id, 'clients.notes_files',                 'modify'),
      (owner_id, 'clients.custom_fields',               'modify'),
      (owner_id, 'clients.sms_opt_in_toggle',           'modify'),
      (owner_id, 'inventory.management',                'modify'),
      (owner_id, 'inventory.management_all_locations',  'modify'),
      (owner_id, 'inventory.vendors_purchase_orders',   'modify'),
      (owner_id, 'reports.own',                         'modify'),
      (owner_id, 'reports.all_barbers',                 'modify'),
      (owner_id, 'reports.all_locations',               'modify'),
      (owner_id, 'reports.time_card_own',               'modify'),
      (owner_id, 'reports.time_card_others',            'modify'),
      (owner_id, 'reports.cancellations_noshows',       'modify'),
      (owner_id, 'reports.deposits',                    'modify'),
      (owner_id, 'payroll.own',                         'modify'),
      (owner_id, 'payroll.all',                         'modify'),
      (owner_id, 'payroll.all_locations',               'modify'),
      (owner_id, 'payroll.management',                  'modify'),
      (owner_id, 'time_off.own',                        'modify'),
      (owner_id, 'time_off.all',                        'modify'),
      (owner_id, 'booking_page.builder',                'modify'),
      (owner_id, 'booking_page.embed_widget',           'modify'),
      (owner_id, 'settings.general',                    'modify'),
      (owner_id, 'settings.own_profile',                'modify'),
      (owner_id, 'settings.others_profiles',            'modify'),
      (owner_id, 'settings.access_level_management',    'modify'),
      (owner_id, 'settings.services',                   'modify'),
      (owner_id, 'settings.discounts',                  'modify'),
      (owner_id, 'settings.subscription_billing',       'modify'),
      (owner_id, 'settings.integrations',               'modify'),
      (owner_id, 'locations.access',                    'modify'),
      (owner_id, 'locations.multi_location_settings',   'modify'),
      (owner_id, 'locations.cross_location_calendar',   'modify'),
      (owner_id, 'locations.multi_location_admin',      'modify')
    ON CONFLICT (access_level_id, permission_key) DO NOTHING;

    -- ── Manager permissions ───────────────────────────────────
    INSERT INTO public.access_level_permissions (access_level_id, permission_key, permission_value)
    VALUES
      (mgr_id, 'calendar.configuration',              'modify'),
      (mgr_id, 'calendar.control_own',                'modify'),
      (mgr_id, 'calendar.control_others',             'modify'),
      (mgr_id, 'calendar.accept_own_appointments',    'modify'),
      (mgr_id, 'calendar.accept_others_appointments', 'modify'),
      (mgr_id, 'checkout.customer_checkout',          'modify'),
      (mgr_id, 'checkout.undo_checkout',              'modify'),
      (mgr_id, 'checkout.modify_price_discount',      'modify'),
      (mgr_id, 'checkout.taxes',                      'modify'),
      (mgr_id, 'checkout.refunds',                    'modify'),
      (mgr_id, 'clients.management',                  'modify'),
      (mgr_id, 'clients.notes_files',                 'modify'),
      (mgr_id, 'clients.custom_fields',               'modify'),
      (mgr_id, 'clients.sms_opt_in_toggle',           'modify'),
      (mgr_id, 'inventory.management',                'modify'),
      (mgr_id, 'inventory.management_all_locations',  'none'),
      (mgr_id, 'inventory.vendors_purchase_orders',   'modify'),
      (mgr_id, 'reports.own',                         'modify'),
      (mgr_id, 'reports.all_barbers',                 'modify'),
      (mgr_id, 'reports.all_locations',               'none'),
      (mgr_id, 'reports.time_card_own',               'modify'),
      (mgr_id, 'reports.time_card_others',            'modify'),
      (mgr_id, 'reports.cancellations_noshows',       'view'),
      (mgr_id, 'reports.deposits',                    'view'),
      (mgr_id, 'payroll.own',                         'modify'),
      (mgr_id, 'payroll.all',                         'modify'),
      (mgr_id, 'payroll.all_locations',               'none'),
      (mgr_id, 'payroll.management',                  'none'),
      (mgr_id, 'time_off.own',                        'modify'),
      (mgr_id, 'time_off.all',                        'modify'),
      (mgr_id, 'booking_page.builder',                'modify'),
      (mgr_id, 'booking_page.embed_widget',           'modify'),
      (mgr_id, 'settings.general',                    'modify'),
      (mgr_id, 'settings.own_profile',                'modify'),
      (mgr_id, 'settings.others_profiles',            'modify'),
      (mgr_id, 'settings.access_level_management',    'none'),
      (mgr_id, 'settings.services',                   'modify'),
      (mgr_id, 'settings.discounts',                  'modify'),
      (mgr_id, 'settings.subscription_billing',       'none'),
      (mgr_id, 'settings.integrations',               'none'),
      (mgr_id, 'locations.access',                    'none'),
      (mgr_id, 'locations.multi_location_settings',   'none'),
      (mgr_id, 'locations.cross_location_calendar',   'none'),
      (mgr_id, 'locations.multi_location_admin',      'none')
    ON CONFLICT (access_level_id, permission_key) DO NOTHING;

    -- ── Service Provider permissions ──────────────────────────
    INSERT INTO public.access_level_permissions (access_level_id, permission_key, permission_value)
    VALUES
      (sp_id, 'calendar.configuration',              'none'),
      (sp_id, 'calendar.control_own',                'modify'),
      (sp_id, 'calendar.control_others',             'none'),
      (sp_id, 'calendar.accept_own_appointments',    'modify'),
      (sp_id, 'calendar.accept_others_appointments', 'none'),
      (sp_id, 'checkout.customer_checkout',          'modify'),
      (sp_id, 'checkout.undo_checkout',              'none'),
      (sp_id, 'checkout.modify_price_discount',      'none'),
      (sp_id, 'checkout.taxes',                      'none'),
      (sp_id, 'checkout.refunds',                    'none'),
      (sp_id, 'clients.management',                  'none'),
      (sp_id, 'clients.notes_files',                 'view'),
      (sp_id, 'clients.custom_fields',               'none'),
      (sp_id, 'clients.sms_opt_in_toggle',           'none'),
      (sp_id, 'inventory.management',                'none'),
      (sp_id, 'inventory.management_all_locations',  'none'),
      (sp_id, 'inventory.vendors_purchase_orders',   'none'),
      (sp_id, 'reports.own',                         'view'),
      (sp_id, 'reports.all_barbers',                 'none'),
      (sp_id, 'reports.all_locations',               'none'),
      (sp_id, 'reports.time_card_own',               'view'),
      (sp_id, 'reports.time_card_others',            'none'),
      (sp_id, 'reports.cancellations_noshows',       'none'),
      (sp_id, 'reports.deposits',                    'none'),
      (sp_id, 'payroll.own',                         'view'),
      (sp_id, 'payroll.all',                         'none'),
      (sp_id, 'payroll.all_locations',               'none'),
      (sp_id, 'payroll.management',                  'none'),
      (sp_id, 'time_off.own',                        'modify'),
      (sp_id, 'time_off.all',                        'none'),
      (sp_id, 'booking_page.builder',                'none'),
      (sp_id, 'booking_page.embed_widget',           'none'),
      (sp_id, 'settings.general',                    'none'),
      (sp_id, 'settings.own_profile',                'modify'),
      (sp_id, 'settings.others_profiles',            'none'),
      (sp_id, 'settings.access_level_management',    'none'),
      (sp_id, 'settings.services',                   'none'),
      (sp_id, 'settings.discounts',                  'none'),
      (sp_id, 'settings.subscription_billing',       'none'),
      (sp_id, 'settings.integrations',               'none'),
      (sp_id, 'locations.access',                    'none'),
      (sp_id, 'locations.multi_location_settings',   'none'),
      (sp_id, 'locations.cross_location_calendar',   'none'),
      (sp_id, 'locations.multi_location_admin',      'none')
    ON CONFLICT (access_level_id, permission_key) DO NOTHING;

    -- ── Backfill barbers.access_level_id ─────────────────────
    UPDATE public.barbers SET access_level_id = owner_id
    WHERE shop_id = v_shop_id AND permission_level IN ('owner', 'superadmin')
      AND access_level_id IS NULL;

    UPDATE public.barbers SET access_level_id = mgr_id
    WHERE shop_id = v_shop_id AND permission_level = 'manager'
      AND access_level_id IS NULL;

    UPDATE public.barbers SET access_level_id = sp_id
    WHERE shop_id = v_shop_id AND permission_level = 'service_provider'
      AND access_level_id IS NULL;

  END LOOP;
END $$;

-- ─── SECURITY DEFINER helper for Phase 4 RLS use ─────────────
-- Returns true if the current auth user's barber row has the given
-- permission at or above min_value in the access_level_permissions table.
-- Phase 4 will update RLS policies to call this instead of checking
-- permission_level directly.

CREATE OR REPLACE FUNCTION public.barber_has_access_level_permission(
  perm_key  text,
  min_value text DEFAULT 'view'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_access_level_id uuid;
  v_perm_value      text;
BEGIN
  SELECT access_level_id INTO v_access_level_id
  FROM public.barbers
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_access_level_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT permission_value INTO v_perm_value
  FROM public.access_level_permissions
  WHERE access_level_id = v_access_level_id
    AND permission_key  = perm_key
  LIMIT 1;

  IF v_perm_value IS NULL OR v_perm_value = 'none' THEN
    RETURN false;
  END IF;

  CASE min_value
    WHEN 'view' THEN
      RETURN v_perm_value IN ('view', 'modify', 'modify_with_limit');
    WHEN 'modify' THEN
      RETURN v_perm_value IN ('modify', 'modify_with_limit');
    WHEN 'modify_with_limit' THEN
      RETURN v_perm_value = 'modify_with_limit';
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Revoke from anon; only authenticated sessions should call this
REVOKE EXECUTE ON FUNCTION public.barber_has_access_level_permission(text, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.barber_has_access_level_permission(text, text) TO authenticated;
