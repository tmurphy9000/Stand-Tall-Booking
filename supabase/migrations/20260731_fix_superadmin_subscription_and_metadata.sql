-- Fix the superadmin account's missing subscription row and stale user_metadata.
--
-- Root cause (two separate issues):
--
-- 1. No subscriptions row for user 4c89f990-...
--    The subscriptions table is populated by provisionShopForNewSubscriber() in the
--    stripe-webhook on checkout.session.completed. The superadmin account was provisioned
--    manually and never went through Stripe checkout, so no row was ever created.
--    Migration 20260730_backfill_subscriptions_shop_id.sql was a no-op here because it
--    only UPDATEs existing rows — it cannot create what doesn't exist.
--
-- 2. user_metadata.shop_id = placeholder UUID
--    Migration 20260616_phase2_backfill_rls.sql explicitly wrote
--    shop_id = '00000000-0000-0000-0000-000000000001' into Tanner's auth.users row.
--    provisionShopForNewSubscriber() is the only code path that overwrites it with the
--    real shop_id, and it only runs via the stripe-webhook — which never fired for this
--    account.

-- 1. Insert missing subscription row for the superadmin account.
INSERT INTO public.subscriptions (user_id, shop_id, tier, status)
VALUES (
  '4c89f990-abbe-47a3-b43c-f444bc8016a8',
  'a6adc896-8662-4d40-b7e9-88975aee443a',
  'elite',
  'active'
)
ON CONFLICT (user_id) DO UPDATE SET
  shop_id = EXCLUDED.shop_id,
  tier    = EXCLUDED.tier,
  status  = EXCLUDED.status;

-- 2. Correct user_metadata.shop_id (was the placeholder; real shop was provisioned separately).
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data
  || '{"shop_id": "a6adc896-8662-4d40-b7e9-88975aee443a"}'::jsonb
WHERE id = '4c89f990-abbe-47a3-b43c-f444bc8016a8'
  AND (
    raw_user_meta_data->>'shop_id' IS NULL
    OR raw_user_meta_data->>'shop_id' = '00000000-0000-0000-0000-000000000001'
  );
