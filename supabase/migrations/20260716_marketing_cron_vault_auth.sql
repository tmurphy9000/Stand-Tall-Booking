-- Replaces the three marketing cron jobs (from 20260715) with versions that
-- pull the service role key from Supabase Vault instead of current_setting().
-- current_setting() requires ALTER DATABASE which needs superuser access that
-- Supabase's hosted Postgres doesn't grant.
--
-- cron.schedule() with an existing job name replaces the job in-place, so no
-- explicit unschedule step is needed.
--
-- ── ONE-TIME SETUP ────────────────────────────────────────────────────────────
-- Run this ONCE in the Supabase SQL Editor (Dashboard → SQL Editor → New query):
--
--   SELECT vault.create_secret(
--     'eyJ...',                         -- paste your full service_role JWT here
--     'marketing_service_role_key',
--     'Service role JWT for marketing automation cron jobs'
--   );
--
-- Your service role key: Dashboard → Project Settings → API → service_role
-- (the long eyJ… token labelled "secret")
--
-- The key is stored encrypted via pgsodium and is not visible in plaintext in
-- any table after this step. You can confirm it was stored without seeing the
-- value by running:
--   SELECT id, name, created_at FROM vault.secrets
--   WHERE name = 'marketing_service_role_key';
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Review Request ────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'automation-review-request-daily',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url                  := 'https://mmmkachplbkaxvhauhaa.supabase.co/functions/v1/automation-review-request',
    headers              := jsonb_build_object(
                              'Content-Type',  'application/json',
                              'Authorization', 'Bearer ' || COALESCE(
                                (SELECT decrypted_secret
                                 FROM vault.decrypted_secrets
                                 WHERE name = 'marketing_service_role_key'
                                 LIMIT 1),
                                'VAULT_SECRET_NOT_CONFIGURED'
                              )
                            ),
    body                 := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- ── Win-Back ──────────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'automation-winback-daily',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url                  := 'https://mmmkachplbkaxvhauhaa.supabase.co/functions/v1/automation-winback',
    headers              := jsonb_build_object(
                              'Content-Type',  'application/json',
                              'Authorization', 'Bearer ' || COALESCE(
                                (SELECT decrypted_secret
                                 FROM vault.decrypted_secrets
                                 WHERE name = 'marketing_service_role_key'
                                 LIMIT 1),
                                'VAULT_SECRET_NOT_CONFIGURED'
                              )
                            ),
    body                 := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- ── Birthday ─────────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'automation-birthday-daily',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url                  := 'https://mmmkachplbkaxvhauhaa.supabase.co/functions/v1/automation-birthday',
    headers              := jsonb_build_object(
                              'Content-Type',  'application/json',
                              'Authorization', 'Bearer ' || COALESCE(
                                (SELECT decrypted_secret
                                 FROM vault.decrypted_secrets
                                 WHERE name = 'marketing_service_role_key'
                                 LIMIT 1),
                                'VAULT_SECRET_NOT_CONFIGURED'
                              )
                            ),
    body                 := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
