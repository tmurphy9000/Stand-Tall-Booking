-- The original signup_attempts_select_superadmin policy predates the Owner tier
-- and only allows permission_level = 'superadmin'. Owners can't see drop-off data.
-- Fix: drop and recreate to allow both superadmin and owner — matching isAdminTier.

DROP POLICY IF EXISTS "signup_attempts_select_superadmin" ON public.signup_attempts;

CREATE POLICY "signup_attempts_select_admin"
  ON public.signup_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.barbers
      WHERE barbers.user_id = auth.uid()
        AND barbers.permission_level IN ('superadmin', 'owner')
    )
  );
