-- Critical RLS fixes (C-1 through C-4, H-3) from the 2026-06-28 security audit.
--
-- C-1: barbers — anon ALL → anon SELECT only
-- C-2: bookings — anon ALL → anon SELECT + INSERT only
-- C-3: shop_settings — drop anon ALL (anon SELECT policy already exists)
-- C-4: client_imports — drop both all-access policies, add authenticated shop-scoped policies
-- H-3: otp_codes — drop all anon policies (sendOTP/verifyOTP use service role exclusively)

-- ── C-1: barbers ─────────────────────────────────────────────────────────────
-- Drop the ALL policy — it let anon INSERT, UPDATE, DELETE barber rows from any shop.
DROP POLICY IF EXISTS "Anon access barbers" ON public.barbers;

-- Anon SELECT is still needed for the booking page to show available barbers.
CREATE POLICY "barbers_anon_select"
  ON public.barbers FOR SELECT TO anon
  USING (true);

-- ── C-2: bookings ─────────────────────────────────────────────────────────────
-- Drop the ALL policy — it let anon UPDATE/DELETE any booking from any shop.
DROP POLICY IF EXISTS "Anon access bookings" ON public.bookings;

-- Anon SELECT: availability checking (which time slots are taken for a given date/barber).
CREATE POLICY "bookings_anon_select"
  ON public.bookings FOR SELECT TO anon
  USING (true);

-- Anon INSERT: creating a new booking from the public booking page.
-- Guest cancellations go through the stripe-refund-deposit edge function (service role),
-- so anon UPDATE is not needed.
CREATE POLICY "bookings_anon_insert"
  ON public.bookings FOR INSERT TO anon
  WITH CHECK (true);

-- ── C-3: shop_settings ───────────────────────────────────────────────────────
-- Drop the ALL policy — it let anon INSERT, UPDATE, DELETE any shop's settings.
-- The existing "Anon read shop_settings" SELECT policy is kept as-is.
DROP POLICY IF EXISTS "Anon access shop_settings" ON public.shop_settings;

-- ── C-4: client_imports ──────────────────────────────────────────────────────
-- Both prior policies granted anon + authenticated ALL with qual: true.
-- Replace with authenticated-only, shop-scoped, permission-gated policies.
DROP POLICY IF EXISTS "Allow all on client_imports" ON public.client_imports;
DROP POLICY IF EXISTS "Anon full access client_imports" ON public.client_imports;

-- SELECT: owner/manager can view import jobs for their shop.
CREATE POLICY "client_imports_select"
  ON public.client_imports FOR SELECT TO authenticated
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

-- INSERT: owner/manager can create new import jobs.
CREATE POLICY "client_imports_insert"
  ON public.client_imports FOR INSERT TO authenticated
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

-- UPDATE: owner/manager can update import job status (e.g. mark as failed on client-side error).
CREATE POLICY "client_imports_update"
  ON public.client_imports FOR UPDATE TO authenticated
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

-- ── H-3: otp_codes ───────────────────────────────────────────────────────────
-- sendOTP and verifyOTP both use SUPABASE_SERVICE_ROLE_KEY — they do not rely on
-- any anon policy. Dropping these closes OTP enumeration (anon SELECT) and the
-- ability to DOS OTP verification (anon UPDATE marking codes as used).
DROP POLICY IF EXISTS "Public can insert otp codes" ON public.otp_codes;
DROP POLICY IF EXISTS "Public can read otp codes" ON public.otp_codes;
DROP POLICY IF EXISTS "Public can update otp codes" ON public.otp_codes;
