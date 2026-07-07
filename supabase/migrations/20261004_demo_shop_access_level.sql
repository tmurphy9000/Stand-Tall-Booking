-- Seed default access levels + permissions for the demo shop, then assign
-- the owner barber (Marcus Johnson) to the Owner level.
--
-- This runs service-role, so RLS is not a factor.
-- Uses DO $$ to be idempotent: existing rows are untouched.

DO $$
DECLARE
  v_shop_id   uuid := '4bb6cc13-e208-42b8-8ef2-6d5ecbb87d59';
  owner_id    uuid;
  mgr_id      uuid;
  sp_id       uuid;
BEGIN
  -- ── 1. Delete the empty placeholder level created during debugging ──────────
  DELETE FROM public.access_levels
  WHERE shop_id = v_shop_id
    AND name = 'Demo Owner'
    AND is_default = false;

  -- ── 2. Seed the three canonical default levels (idempotent) ─────────────────
  INSERT INTO public.access_levels (shop_id, name, description, is_default, is_active, legacy_permission_level)
  VALUES
    (v_shop_id, 'Owner',            'Full access to all features and settings',                  true, true, 'owner'),
    (v_shop_id, 'Manager',          'Manage daily operations, staff, clients, and reports',      true, true, 'manager'),
    (v_shop_id, 'Service Provider', 'Basic access: own calendar, own reports, own time-off',     true, true, 'service_provider')
  ON CONFLICT DO NOTHING;

  SELECT id INTO owner_id FROM public.access_levels WHERE shop_id = v_shop_id AND legacy_permission_level = 'owner'   LIMIT 1;
  SELECT id INTO mgr_id   FROM public.access_levels WHERE shop_id = v_shop_id AND legacy_permission_level = 'manager' LIMIT 1;
  SELECT id INTO sp_id    FROM public.access_levels WHERE shop_id = v_shop_id AND legacy_permission_level = 'service_provider' LIMIT 1;

  -- ── 3. Seed full permission matrix for Owner ─────────────────────────────────
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
    (owner_id, 'settings.integrations',               'modify')
  ON CONFLICT (access_level_id, permission_key) DO NOTHING;

  -- ── 4. Assign Marcus Johnson (owner barber) to the Owner level ──────────────
  UPDATE public.barbers
  SET access_level_id = owner_id
  WHERE id = '67b9984c-e044-4802-aa14-6084d5f15099'
    AND access_level_id IS NULL;

END $$;
