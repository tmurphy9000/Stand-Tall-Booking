-- ─────────────────────────────────────────────────────────────────────────────
-- M-10: Wire barber_has_access_level_permission() into bookings,
--       cash_transactions, products, inventory_adjustments, and discounts.
--
-- Pattern follows time_off_requests exactly:
--   • own path  : permission_check('x.own','level') AND barber_id = caller's id
--   • all path  : permission_check('x.all','level')  (no row filter needed)
--   • legacy    : permission_level IN ('owner','manager','superadmin')
--                 AND access_level_id IS NULL
--   • shop scope: shop_id = current_shop_id() guards every policy so cross-shop
--                 bleed is impossible even when a permission check returns true.
--
-- get_booked_slots is SECURITY DEFINER — anon booking page bypasses RLS via
-- the function; no anon SELECT on bookings is needed or added.
-- bookings_anon_insert is preserved exactly as-is.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Seed new permission keys for the three default access levels
-- ─────────────────────────────────────────────────────────────────────────────
-- Access level IDs (default, shop-agnostic):
--   Owner          : ac3beedc-b7fa-42d2-ac27-7069becb9573
--   Manager        : 69f48d1b-b6da-491a-b429-6ee78e78ce40
--   Service Provider: fd27f340-27f4-4f2b-a42b-ee368c27690f

INSERT INTO public.access_level_permissions (id, access_level_id, permission_key, permission_value)
VALUES
  -- bookings.own  (service providers can manage their own calendar)
  (gen_random_uuid(), 'ac3beedc-b7fa-42d2-ac27-7069becb9573', 'bookings.own', 'modify'),
  (gen_random_uuid(), '69f48d1b-b6da-491a-b429-6ee78e78ce40', 'bookings.own', 'modify'),
  (gen_random_uuid(), 'fd27f340-27f4-4f2b-a42b-ee368c27690f', 'bookings.own', 'modify'),

  -- bookings.all  (service providers cannot see/edit other barbers' calendars)
  (gen_random_uuid(), 'ac3beedc-b7fa-42d2-ac27-7069becb9573', 'bookings.all', 'modify'),
  (gen_random_uuid(), '69f48d1b-b6da-491a-b429-6ee78e78ce40', 'bookings.all', 'modify'),
  (gen_random_uuid(), 'fd27f340-27f4-4f2b-a42b-ee368c27690f', 'bookings.all', 'none'),

  -- cash.view  (all roles can view the cash log; service providers get view-only)
  (gen_random_uuid(), 'ac3beedc-b7fa-42d2-ac27-7069becb9573', 'cash.view', 'modify'),
  (gen_random_uuid(), '69f48d1b-b6da-491a-b429-6ee78e78ce40', 'cash.view', 'modify'),
  (gen_random_uuid(), 'fd27f340-27f4-4f2b-a42b-ee368c27690f', 'cash.view', 'view'),

  -- cash.manage  (service providers can add their own cash entries)
  (gen_random_uuid(), 'ac3beedc-b7fa-42d2-ac27-7069becb9573', 'cash.manage', 'modify'),
  (gen_random_uuid(), '69f48d1b-b6da-491a-b429-6ee78e78ce40', 'cash.manage', 'modify'),
  (gen_random_uuid(), 'fd27f340-27f4-4f2b-a42b-ee368c27690f', 'cash.manage', 'modify'),

  -- inventory.view  (service providers can view inventory)
  (gen_random_uuid(), 'ac3beedc-b7fa-42d2-ac27-7069becb9573', 'inventory.view', 'modify'),
  (gen_random_uuid(), '69f48d1b-b6da-491a-b429-6ee78e78ce40', 'inventory.view', 'modify'),
  (gen_random_uuid(), 'fd27f340-27f4-4f2b-a42b-ee368c27690f', 'inventory.view', 'view'),

  -- inventory.manage  (service providers cannot modify inventory)
  (gen_random_uuid(), 'ac3beedc-b7fa-42d2-ac27-7069becb9573', 'inventory.manage', 'modify'),
  (gen_random_uuid(), '69f48d1b-b6da-491a-b429-6ee78e78ce40', 'inventory.manage', 'modify'),
  (gen_random_uuid(), 'fd27f340-27f4-4f2b-a42b-ee368c27690f', 'inventory.manage', 'none'),

  -- discounts.view  (service providers need view for checkout discount lookup)
  (gen_random_uuid(), 'ac3beedc-b7fa-42d2-ac27-7069becb9573', 'discounts.view', 'modify'),
  (gen_random_uuid(), '69f48d1b-b6da-491a-b429-6ee78e78ce40', 'discounts.view', 'modify'),
  (gen_random_uuid(), 'fd27f340-27f4-4f2b-a42b-ee368c27690f', 'discounts.view', 'view'),

  -- discounts.manage  (service providers cannot create/edit discount rules)
  (gen_random_uuid(), 'ac3beedc-b7fa-42d2-ac27-7069becb9573', 'discounts.manage', 'modify'),
  (gen_random_uuid(), '69f48d1b-b6da-491a-b429-6ee78e78ce40', 'discounts.manage', 'modify'),
  (gen_random_uuid(), 'fd27f340-27f4-4f2b-a42b-ee368c27690f', 'discounts.manage', 'none')

ON CONFLICT (access_level_id, permission_key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. bookings
--    Drop the broad ALL policy; preserve bookings_anon_insert untouched.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Shop access bookings" ON public.bookings;

CREATE POLICY bookings_select ON public.bookings
  FOR SELECT TO authenticated
  USING (
    shop_id = current_shop_id()
    AND (
      (   barber_has_access_level_permission('bookings.own', 'view')
       AND barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1))
      OR barber_has_access_level_permission('bookings.all', 'view')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
          AND access_level_id IS NULL
      )
    )
  );

CREATE POLICY bookings_insert ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    shop_id = current_shop_id()
    AND (
      (   barber_has_access_level_permission('bookings.own', 'modify')
       AND barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1))
      OR barber_has_access_level_permission('bookings.all', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
          AND access_level_id IS NULL
      )
    )
  );

CREATE POLICY bookings_update ON public.bookings
  FOR UPDATE TO authenticated
  USING (
    shop_id = current_shop_id()
    AND (
      (   barber_has_access_level_permission('bookings.own', 'modify')
       AND barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1))
      OR barber_has_access_level_permission('bookings.all', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
          AND access_level_id IS NULL
      )
    )
  )
  WITH CHECK (
    shop_id = current_shop_id()
    AND (
      (   barber_has_access_level_permission('bookings.own', 'modify')
       AND barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1))
      OR barber_has_access_level_permission('bookings.all', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
          AND access_level_id IS NULL
      )
    )
  );

-- DELETE: bookings.all + modify OR legacy admin only (barbers cancel, not delete)
CREATE POLICY bookings_delete ON public.bookings
  FOR DELETE TO authenticated
  USING (
    shop_id = current_shop_id()
    AND (
      barber_has_access_level_permission('bookings.all', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
          AND access_level_id IS NULL
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. cash_transactions
--    Shop-wide log — no own/all split; UPDATE and DELETE are legacy admin only.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Shop access cash_transactions" ON public.cash_transactions;

CREATE POLICY cash_transactions_select ON public.cash_transactions
  FOR SELECT TO authenticated
  USING (
    shop_id = current_shop_id()
    AND (
      barber_has_access_level_permission('cash.view', 'view')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
          AND access_level_id IS NULL
      )
    )
  );

CREATE POLICY cash_transactions_insert ON public.cash_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    shop_id = current_shop_id()
    AND (
      barber_has_access_level_permission('cash.manage', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
          AND access_level_id IS NULL
      )
    )
  );

-- Editing existing cash entries is a management action — legacy admin only.
CREATE POLICY cash_transactions_update ON public.cash_transactions
  FOR UPDATE TO authenticated
  USING (
    shop_id = current_shop_id()
    AND EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
        AND access_level_id IS NULL
    )
  )
  WITH CHECK (
    shop_id = current_shop_id()
    AND EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
        AND access_level_id IS NULL
    )
  );

CREATE POLICY cash_transactions_delete ON public.cash_transactions
  FOR DELETE TO authenticated
  USING (
    shop_id = current_shop_id()
    AND EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
        AND access_level_id IS NULL
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. products  (inventory.view for read; inventory.manage for writes)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Shop access products" ON public.products;

CREATE POLICY products_select ON public.products
  FOR SELECT TO authenticated
  USING (
    shop_id = current_shop_id()
    AND (
      barber_has_access_level_permission('inventory.view', 'view')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
          AND access_level_id IS NULL
      )
    )
  );

CREATE POLICY products_insert ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (
    shop_id = current_shop_id()
    AND (
      barber_has_access_level_permission('inventory.manage', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
          AND access_level_id IS NULL
      )
    )
  );

CREATE POLICY products_update ON public.products
  FOR UPDATE TO authenticated
  USING (
    shop_id = current_shop_id()
    AND (
      barber_has_access_level_permission('inventory.manage', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
          AND access_level_id IS NULL
      )
    )
  )
  WITH CHECK (
    shop_id = current_shop_id()
    AND (
      barber_has_access_level_permission('inventory.manage', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
          AND access_level_id IS NULL
      )
    )
  );

CREATE POLICY products_delete ON public.products
  FOR DELETE TO authenticated
  USING (
    shop_id = current_shop_id()
    AND (
      barber_has_access_level_permission('inventory.manage', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
          AND access_level_id IS NULL
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. inventory_adjustments  (same gates as products)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Shop access inventory_adjustments" ON public.inventory_adjustments;

CREATE POLICY inventory_adjustments_select ON public.inventory_adjustments
  FOR SELECT TO authenticated
  USING (
    shop_id = current_shop_id()
    AND (
      barber_has_access_level_permission('inventory.view', 'view')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
          AND access_level_id IS NULL
      )
    )
  );

CREATE POLICY inventory_adjustments_insert ON public.inventory_adjustments
  FOR INSERT TO authenticated
  WITH CHECK (
    shop_id = current_shop_id()
    AND (
      barber_has_access_level_permission('inventory.manage', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
          AND access_level_id IS NULL
      )
    )
  );

CREATE POLICY inventory_adjustments_update ON public.inventory_adjustments
  FOR UPDATE TO authenticated
  USING (
    shop_id = current_shop_id()
    AND (
      barber_has_access_level_permission('inventory.manage', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
          AND access_level_id IS NULL
      )
    )
  )
  WITH CHECK (
    shop_id = current_shop_id()
    AND (
      barber_has_access_level_permission('inventory.manage', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
          AND access_level_id IS NULL
      )
    )
  );

CREATE POLICY inventory_adjustments_delete ON public.inventory_adjustments
  FOR DELETE TO authenticated
  USING (
    shop_id = current_shop_id()
    AND (
      barber_has_access_level_permission('inventory.manage', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
          AND access_level_id IS NULL
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. discounts  (discounts.view for read — needed for checkout; discounts.manage for writes)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Shop access discounts" ON public.discounts;

CREATE POLICY discounts_select ON public.discounts
  FOR SELECT TO authenticated
  USING (
    shop_id = current_shop_id()
    AND (
      barber_has_access_level_permission('discounts.view', 'view')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
          AND access_level_id IS NULL
      )
    )
  );

CREATE POLICY discounts_insert ON public.discounts
  FOR INSERT TO authenticated
  WITH CHECK (
    shop_id = current_shop_id()
    AND (
      barber_has_access_level_permission('discounts.manage', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
          AND access_level_id IS NULL
      )
    )
  );

CREATE POLICY discounts_update ON public.discounts
  FOR UPDATE TO authenticated
  USING (
    shop_id = current_shop_id()
    AND (
      barber_has_access_level_permission('discounts.manage', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
          AND access_level_id IS NULL
      )
    )
  )
  WITH CHECK (
    shop_id = current_shop_id()
    AND (
      barber_has_access_level_permission('discounts.manage', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
          AND access_level_id IS NULL
      )
    )
  );

CREATE POLICY discounts_delete ON public.discounts
  FOR DELETE TO authenticated
  USING (
    shop_id = current_shop_id()
    AND (
      barber_has_access_level_permission('discounts.manage', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
          AND access_level_id IS NULL
      )
    )
  );
