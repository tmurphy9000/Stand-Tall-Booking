-- Replace "Shop access payroll_reports" (shop-scoped only, authenticated ALL)
-- with granular policies that distinguish own vs. all-barber payroll access,
-- matching the Access Levels permission matrix.
--
-- Permission keys used:
--   payroll.own  — read/write own payroll report (Owner: modify, Manager: modify, SP: view)
--   payroll.all  — read/write all barbers' reports (Owner: modify, Manager: modify, SP: none)
--
-- DELETE is restricted to payroll.all >= modify only — individual barbers
-- cannot delete their own payroll records.

DROP POLICY IF EXISTS "Shop access payroll_reports" ON public.payroll_reports;

-- SELECT: own report (payroll.own >= view) OR all reports (payroll.all >= view)
CREATE POLICY "payroll_reports_select"
  ON public.payroll_reports FOR SELECT TO authenticated
  USING (
    shop_id = public.current_shop_id()
    AND (
      (
        barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1)
        AND public.barber_has_access_level_permission('payroll.own', 'view')
      )
      OR public.barber_has_access_level_permission('payroll.all', 'view')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level IN ('owner', 'manager', 'superadmin')
          AND access_level_id IS NULL
      )
    )
  );

-- INSERT: own report (payroll.own >= modify) OR all reports (payroll.all >= modify)
CREATE POLICY "payroll_reports_insert"
  ON public.payroll_reports FOR INSERT TO authenticated
  WITH CHECK (
    shop_id = public.current_shop_id()
    AND (
      (
        barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1)
        AND public.barber_has_access_level_permission('payroll.own', 'modify')
      )
      OR public.barber_has_access_level_permission('payroll.all', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level IN ('owner', 'manager', 'superadmin')
          AND access_level_id IS NULL
      )
    )
  );

-- UPDATE: same as INSERT
CREATE POLICY "payroll_reports_update"
  ON public.payroll_reports FOR UPDATE TO authenticated
  USING (
    shop_id = public.current_shop_id()
    AND (
      (
        barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1)
        AND public.barber_has_access_level_permission('payroll.own', 'modify')
      )
      OR public.barber_has_access_level_permission('payroll.all', 'modify')
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
        AND public.barber_has_access_level_permission('payroll.own', 'modify')
      )
      OR public.barber_has_access_level_permission('payroll.all', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level IN ('owner', 'manager', 'superadmin')
          AND access_level_id IS NULL
      )
    )
  );

-- DELETE: payroll.all >= modify only — no self-delete of payroll records
CREATE POLICY "payroll_reports_delete"
  ON public.payroll_reports FOR DELETE TO authenticated
  USING (
    shop_id = public.current_shop_id()
    AND (
      public.barber_has_access_level_permission('payroll.all', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level IN ('owner', 'manager', 'superadmin')
          AND access_level_id IS NULL
      )
    )
  );
