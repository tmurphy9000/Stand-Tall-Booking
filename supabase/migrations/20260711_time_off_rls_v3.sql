-- Replace time_off_requests RLS policies to use the access_level_permissions
-- system (via barber_has_access_level_permission) for the "can manage all time-off"
-- check, while keeping a legacy fallback for barbers whose access_level_id has
-- not yet been set (safety net during the Phase 3→4 transition).
--
-- The per-barber SELECT/INSERT ownership checks are unchanged.

DROP POLICY IF EXISTS "time_off_requests_select"  ON public.time_off_requests;
DROP POLICY IF EXISTS "time_off_requests_insert"  ON public.time_off_requests;
DROP POLICY IF EXISTS "time_off_requests_update"  ON public.time_off_requests;
DROP POLICY IF EXISTS "time_off_requests_delete"  ON public.time_off_requests;

-- Helper expression: caller can manage all time-off requests.
-- Checks access_level_permissions first; falls back to legacy permission_level
-- for any barber whose access_level_id is still NULL.
-- Extracted as a macro comment for clarity — inlined into each policy below.
--
--   public.barber_has_access_level_permission('time_off.all', 'modify')
--   OR EXISTS (
--     SELECT 1 FROM public.barbers
--     WHERE user_id = auth.uid()
--       AND permission_level IN ('owner','manager','superadmin')
--       AND access_level_id IS NULL
--   )

CREATE POLICY "time_off_requests_select"
  ON public.time_off_requests FOR SELECT
  TO authenticated
  USING (
    -- Own request
    barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1)
    -- OR caller can manage all time-off
    OR public.barber_has_access_level_permission('time_off.all', 'modify')
    OR EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner','manager','superadmin')
        AND access_level_id IS NULL
    )
  );

CREATE POLICY "time_off_requests_insert"
  ON public.time_off_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "time_off_requests_update"
  ON public.time_off_requests FOR UPDATE
  TO authenticated
  USING (
    barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1)
    OR public.barber_has_access_level_permission('time_off.all', 'modify')
    OR EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner','manager','superadmin')
        AND access_level_id IS NULL
    )
  )
  WITH CHECK (
    barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1)
    OR public.barber_has_access_level_permission('time_off.all', 'modify')
    OR EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner','manager','superadmin')
        AND access_level_id IS NULL
    )
  );

CREATE POLICY "time_off_requests_delete"
  ON public.time_off_requests FOR DELETE
  TO authenticated
  USING (
    public.barber_has_access_level_permission('time_off.all', 'modify')
    OR EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner','manager','superadmin')
        AND access_level_id IS NULL
    )
  );
