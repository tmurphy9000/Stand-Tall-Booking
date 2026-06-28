-- Replace "Shop access barber_sensitive_info" (shop-scoped only, authenticated ALL)
-- with granular policies distinguishing own vs. others' sensitive payroll data
-- (SSN, bank account, routing number, driver's license).
--
-- Permission keys used:
--   settings.own_profile     — barber can view/edit their own record (SP: modify, all roles: modify)
--   settings.others_profiles — can view/edit OTHER barbers' sensitive info (Manager: modify, SP: none)
--
-- DELETE is restricted to settings.others_profiles >= modify only — barbers
-- cannot delete their own sensitive info record.

DROP POLICY IF EXISTS "Shop access barber_sensitive_info" ON public.barber_sensitive_info;

-- SELECT: own record (any barber) OR others' profiles permission (manager+)
CREATE POLICY "barber_sensitive_info_select"
  ON public.barber_sensitive_info FOR SELECT TO authenticated
  USING (
    shop_id = public.current_shop_id()
    AND (
      (
        barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1)
        AND public.barber_has_access_level_permission('settings.own_profile', 'view')
      )
      OR public.barber_has_access_level_permission('settings.others_profiles', 'view')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level IN ('owner', 'manager', 'superadmin')
          AND access_level_id IS NULL
      )
    )
  );

-- INSERT: own record OR others' profiles permission
CREATE POLICY "barber_sensitive_info_insert"
  ON public.barber_sensitive_info FOR INSERT TO authenticated
  WITH CHECK (
    shop_id = public.current_shop_id()
    AND (
      (
        barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1)
        AND public.barber_has_access_level_permission('settings.own_profile', 'modify')
      )
      OR public.barber_has_access_level_permission('settings.others_profiles', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level IN ('owner', 'manager', 'superadmin')
          AND access_level_id IS NULL
      )
    )
  );

-- UPDATE: own record OR others' profiles permission
CREATE POLICY "barber_sensitive_info_update"
  ON public.barber_sensitive_info FOR UPDATE TO authenticated
  USING (
    shop_id = public.current_shop_id()
    AND (
      (
        barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1)
        AND public.barber_has_access_level_permission('settings.own_profile', 'modify')
      )
      OR public.barber_has_access_level_permission('settings.others_profiles', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level IN ('owner', 'manager', 'superadmin')
          AND access_level_id IS NULL
      )
    )
  )
  WITH CHECK (
    shop_id = public.current_shop_id()
    AND (
      (
        barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1)
        AND public.barber_has_access_level_permission('settings.own_profile', 'modify')
      )
      OR public.barber_has_access_level_permission('settings.others_profiles', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level IN ('owner', 'manager', 'superadmin')
          AND access_level_id IS NULL
      )
    )
  );

-- DELETE: settings.others_profiles >= modify only — no self-delete of sensitive records
CREATE POLICY "barber_sensitive_info_delete"
  ON public.barber_sensitive_info FOR DELETE TO authenticated
  USING (
    shop_id = public.current_shop_id()
    AND (
      public.barber_has_access_level_permission('settings.others_profiles', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level IN ('owner', 'manager', 'superadmin')
          AND access_level_id IS NULL
      )
    )
  );
