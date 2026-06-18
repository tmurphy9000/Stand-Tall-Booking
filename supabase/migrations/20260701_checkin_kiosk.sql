-- Check-In Kiosk feature.
--
-- kiosk_token: a per-shop random token that forms the public kiosk URL
--   (/checkin/:kioskToken).  Anyone who knows the token can use the kiosk
--   for that shop only; all app-layer queries are scoped to the resolved
--   shop_id, providing data isolation without requiring a login.
--
-- checked_in_at: set when a client self-checks-in via the kiosk (or when
--   staff manually mark a booking as arrived).

-- 1. kiosk_token on shop_settings
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS kiosk_token text;

ALTER TABLE public.shop_settings
  ALTER COLUMN kiosk_token SET DEFAULT replace(gen_random_uuid()::text, '-', '');

UPDATE public.shop_settings
SET kiosk_token = replace(gen_random_uuid()::text, '-', '')
WHERE kiosk_token IS NULL;

ALTER TABLE public.shop_settings
  DROP CONSTRAINT IF EXISTS shop_settings_kiosk_token_key;
ALTER TABLE public.shop_settings
  ADD CONSTRAINT shop_settings_kiosk_token_key UNIQUE (kiosk_token);

-- 2. checked_in_at on bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

-- 3. Allow the anon role (kiosk page) to insert check-in notifications so
--    barbers are alerted in the notification bell when a client arrives.
--    Only adds the policy if no anon INSERT policy already exists on the table
--    (the original schema may have already created one).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'notifications'
      AND cmd        = 'INSERT'
      AND roles::text LIKE '%anon%'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Anon can insert check_in notifications"
        ON public.notifications
        FOR INSERT
        TO anon
        WITH CHECK (true)
    $pol$;
  END IF;
END $$;
