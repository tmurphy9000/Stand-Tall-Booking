-- Fix time_off_requests RLS.
-- The earlier "Shop access time_off_requests" policy (ALL, PERMISSIVE, qual: shop_id = current_shop_id())
-- lets every barber in the shop read every other barber's requests, bypassing the per-barber SELECT
-- policy created in 20260706. Drop it and rebuild all four policies with shop isolation included.

DROP POLICY IF EXISTS "Shop access time_off_requests"  ON public.time_off_requests;
DROP POLICY IF EXISTS "time_off_requests_select"        ON public.time_off_requests;
DROP POLICY IF EXISTS "time_off_requests_insert"        ON public.time_off_requests;
DROP POLICY IF EXISTS "time_off_requests_update"        ON public.time_off_requests;
DROP POLICY IF EXISTS "time_off_requests_delete"        ON public.time_off_requests;

-- SELECT: within the current shop, own requests for service_providers;
--         all requests in the shop for owners/managers/superadmins.
CREATE POLICY "time_off_requests_select"
  ON public.time_off_requests FOR SELECT
  TO authenticated
  USING (
    shop_id = current_shop_id()
    AND (
      barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1)
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level IN ('owner', 'manager', 'superadmin')
      )
    )
  );

-- INSERT: can only create requests linked to own barber_id within own shop.
-- shop_id column defaults to current_shop_id() so no explicit value is required.
CREATE POLICY "time_off_requests_insert"
  ON public.time_off_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    shop_id = current_shop_id()
    AND barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1)
  );

-- UPDATE: own requests + owners/managers can update any within the shop (approval workflow).
CREATE POLICY "time_off_requests_update"
  ON public.time_off_requests FOR UPDATE
  TO authenticated
  USING (
    shop_id = current_shop_id()
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
    shop_id = current_shop_id()
    AND (
      barber_id = (SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1)
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level IN ('owner', 'manager', 'superadmin')
      )
    )
  );

-- DELETE: owners/managers only, within own shop.
CREATE POLICY "time_off_requests_delete"
  ON public.time_off_requests FOR DELETE
  TO authenticated
  USING (
    shop_id = current_shop_id()
    AND EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level IN ('owner', 'manager', 'superadmin')
    )
  );
