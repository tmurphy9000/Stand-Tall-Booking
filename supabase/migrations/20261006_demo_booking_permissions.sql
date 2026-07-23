-- Backfill bookings.own / bookings.all permissions for the demo shop access levels.
--
-- The bookings_select/insert/update/delete RLS policies (added in
-- 20260629000000_m10_access_level_permission_gates.sql) check these two permission
-- keys on every query. The 20261004 migration assigned Marcus Johnson to the Owner
-- access level but only seeded calendar/checkout/client/etc keys — leaving
-- bookings.own and bookings.all absent, which silently zeroed out the demo shop's
-- Transaction page and anywhere else bookings are read as the authenticated user.

DO $$
DECLARE
  v_shop_id uuid := '4bb6cc13-e208-42b8-8ef2-6d5ecbb87d59';
  owner_id  uuid;
  mgr_id    uuid;
  sp_id     uuid;
BEGIN
  SELECT id INTO owner_id FROM public.access_levels
    WHERE shop_id = v_shop_id AND legacy_permission_level = 'owner'   LIMIT 1;
  SELECT id INTO mgr_id   FROM public.access_levels
    WHERE shop_id = v_shop_id AND legacy_permission_level = 'manager' LIMIT 1;
  SELECT id INTO sp_id    FROM public.access_levels
    WHERE shop_id = v_shop_id AND legacy_permission_level = 'service_provider' LIMIT 1;

  -- Owner: full booking access (own + all)
  INSERT INTO public.access_level_permissions (access_level_id, permission_key, permission_value)
  VALUES
    (owner_id, 'bookings.own', 'modify'),
    (owner_id, 'bookings.all', 'modify'),
    (mgr_id,   'bookings.own', 'modify'),
    (mgr_id,   'bookings.all', 'modify'),
    (sp_id,    'bookings.own', 'modify'),
    (sp_id,    'bookings.all', 'none')
  ON CONFLICT (access_level_id, permission_key) DO NOTHING;
END $$;
