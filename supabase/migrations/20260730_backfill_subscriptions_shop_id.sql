-- Backfill subscriptions.shop_id where it is NULL or still holds the legacy
-- placeholder UUID ('00000000-0000-0000-0000-000000000001').
--
-- Root cause: the subscriptions table gained its shop_id column in migration
-- 20260615. For accounts created before that migration, or where the
-- stripe-webhook's provisionShopForNewSubscriber call failed silently, the
-- column was never populated.  useShop() then fell through to
-- user_metadata.shop_id, which may itself hold the placeholder if the JWT
-- was cached before the real shop was provisioned.
--
-- Resolution order (most to least authoritative):
--   1. auth.users.raw_user_meta_data->>'shop_id' if it points to a real shop
--   2. The oldest non-placeholder shop row (single-tenant fallback)
--
-- The UPDATE is a no-op if shop_id is already set to a real value.

UPDATE public.subscriptions AS s
SET shop_id = COALESCE(
    -- Prefer metadata shop_id when it references a real shop
    CASE
        WHEN (u.raw_user_meta_data->>'shop_id') IS NOT NULL
             AND (u.raw_user_meta_data->>'shop_id') <> '00000000-0000-0000-0000-000000000001'
             AND EXISTS (
                 SELECT 1 FROM public.shops
                 WHERE id = (u.raw_user_meta_data->>'shop_id')::uuid
             )
        THEN (u.raw_user_meta_data->>'shop_id')::uuid
    END,
    -- Fallback: oldest real shop in the database (handles stale/missing metadata)
    (
        SELECT id FROM public.shops
        WHERE id <> '00000000-0000-0000-0000-000000000001'
        ORDER BY created_at ASC
        LIMIT 1
    )
)
FROM auth.users u
WHERE u.id = s.user_id
  AND (
      s.shop_id IS NULL
      OR s.shop_id = '00000000-0000-0000-0000-000000000001'
  );
