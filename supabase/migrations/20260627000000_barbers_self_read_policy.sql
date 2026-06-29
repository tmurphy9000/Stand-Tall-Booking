-- Superadmins have shop_id = null, so the existing "Shop access barbers" policy
-- (shop_id = current_shop_id()) evaluates to null = null → NULL → denied.
-- This policy lets any authenticated user always read their own barbers row,
-- which is required for AuthContext to load currentBarber on login.
DROP POLICY IF EXISTS "Users can read own barber row" ON public.barbers;
CREATE POLICY "Users can read own barber row"
  ON public.barbers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
