-- Replace the open catch-all policy on time_off_requests with scoped RLS.
-- Regular barbers (service_provider role) can only read/write their own requests.
-- Owners, managers, and superadmins retain full access for the approval workflow.
-- anon role intentionally gets no policies — public/kiosk pages don't need this table.

DROP POLICY IF EXISTS "Anon full access time_off_requests" ON public.time_off_requests;

-- SELECT: own requests for regular barbers; all requests for owners/managers/superadmins
CREATE POLICY "time_off_requests_select"
  ON public.time_off_requests FOR SELECT
  TO authenticated
  USING (
    barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1)
    OR EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner', 'manager', 'superadmin')
    )
  );

-- INSERT: barbers can only create requests linked to their own barber_id
CREATE POLICY "time_off_requests_insert"
  ON public.time_off_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1)
  );

-- UPDATE: own requests + owners/managers can update any (needed for approval/denial)
CREATE POLICY "time_off_requests_update"
  ON public.time_off_requests FOR UPDATE
  TO authenticated
  USING (
    barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1)
    OR EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner', 'manager', 'superadmin')
    )
  )
  WITH CHECK (
    barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1)
    OR EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner', 'manager', 'superadmin')
    )
  );

-- DELETE: owners/managers only (regular barbers cannot delete their own requests)
CREATE POLICY "time_off_requests_delete"
  ON public.time_off_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner', 'manager', 'superadmin')
    )
  );
