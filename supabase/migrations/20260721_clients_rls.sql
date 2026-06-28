-- Replace "Anon full access clients" (qual: true, ALL operations, anon+authenticated)
-- with granular policies enforcing the Access Levels permission matrix for
-- authenticated users. The anon policy is split so anonymous booking lookups
-- still work (SELECT + INSERT), but anon UPDATE/DELETE are removed entirely.
--
-- Permission keys used:
--   clients.management  — view/modify the client directory (Owner: modify, Manager: modify, SP: none)
--   clients.notes_files — view/modify client notes (Owner: modify, Manager: modify, SP: view)
--
-- Service Providers have clients.management=none but clients.notes_files=view,
-- so the SELECT policy allows either key to grant read access (a SP who can
-- view notes still needs to read the client row to see them).

DROP POLICY IF EXISTS "Anon full access clients" ON public.clients;

-- ── Anon policies (booking flow) ─────────────────────────────────────────────
-- SELECT: phone-number lookups for returning-client detection on the booking page.
-- No shop scope — anon has no JWT claims; the booking page filters by shop_id itself.
CREATE POLICY "clients_anon_select"
  ON public.clients FOR SELECT TO anon
  USING (true);

-- INSERT: new client record creation when a guest books for the first time.
CREATE POLICY "clients_anon_insert"
  ON public.clients FOR INSERT TO anon
  WITH CHECK (true);

-- ── Authenticated policies (permission matrix) ────────────────────────────────

-- SELECT: clients.management >= view  OR  clients.notes_files >= view
CREATE POLICY "clients_select"
  ON public.clients FOR SELECT TO authenticated
  USING (
    shop_id = public.current_shop_id()
    AND (
      public.barber_has_access_level_permission('clients.management', 'view')
      OR public.barber_has_access_level_permission('clients.notes_files', 'view')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level IN ('owner', 'manager', 'superadmin')
          AND access_level_id IS NULL
      )
    )
  );

-- INSERT: clients.management >= modify
CREATE POLICY "clients_insert"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (
    shop_id = public.current_shop_id()
    AND (
      public.barber_has_access_level_permission('clients.management', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level IN ('owner', 'manager', 'superadmin')
          AND access_level_id IS NULL
      )
    )
  );

-- UPDATE: clients.management >= modify
CREATE POLICY "clients_update"
  ON public.clients FOR UPDATE TO authenticated
  USING (
    shop_id = public.current_shop_id()
    AND (
      public.barber_has_access_level_permission('clients.management', 'modify')
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
      public.barber_has_access_level_permission('clients.management', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level IN ('owner', 'manager', 'superadmin')
          AND access_level_id IS NULL
      )
    )
  );

-- DELETE: clients.management >= modify
CREATE POLICY "clients_delete"
  ON public.clients FOR DELETE TO authenticated
  USING (
    shop_id = public.current_shop_id()
    AND (
      public.barber_has_access_level_permission('clients.management', 'modify')
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level IN ('owner', 'manager', 'superadmin')
          AND access_level_id IS NULL
      )
    )
  );
