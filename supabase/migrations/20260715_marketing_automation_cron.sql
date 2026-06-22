-- Marketing Phase 4: daily pg_cron schedules for automation edge functions
--
-- Timing: 14:00 UTC = 10:00 AM US Eastern = 7:00 AM US Pacific.
-- Morning delivery maximises open rates; earlier UTC times (e.g. 10:00) would
-- arrive at 6 AM Eastern which is too early for marketing emails.
--
-- ── ONE-TIME SETUP REQUIRED ──────────────────────────────────────────────────
-- The cron jobs authenticate to the edge functions using your project's service
-- role key. Because this is a secret it is NOT stored in this file. Run the
-- following once in the Supabase SQL Editor (Dashboard → SQL Editor):
--
--   ALTER DATABASE postgres
--     SET app.settings.service_role_key = '<your-service-role-key>';
--
-- Find your service role key at:
--   Supabase Dashboard → Project Settings → API → service_role (the long JWT)
--
-- Until this is set the jobs will run but receive 401s and do nothing harmful.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable required extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Review Request ────────────────────────────────────────────────────────────
-- Fires once per client ever; gate column review_request_sent_at prevents
-- re-sends even if the job runs multiple times.
SELECT cron.schedule(
  'automation-review-request-daily',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url                  := 'https://mmmkachplbkaxvhauhaa.supabase.co/functions/v1/automation-review-request',
    headers              := jsonb_build_object(
                              'Content-Type',  'application/json',
                              'Authorization', 'Bearer ' || COALESCE(
                                                 current_setting('app.settings.service_role_key', true),
                                                 'NOT_CONFIGURED'
                                               )
                            ),
    body                 := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- ── Win-Back ──────────────────────────────────────────────────────────────────
-- Targets clients whose last completed booking was exactly N days ago (N set
-- in Marketing Settings). Gate column last_winback_sent_at prevents duplicate
-- sends within the configured window.
SELECT cron.schedule(
  'automation-winback-daily',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url                  := 'https://mmmkachplbkaxvhauhaa.supabase.co/functions/v1/automation-winback',
    headers              := jsonb_build_object(
                              'Content-Type',  'application/json',
                              'Authorization', 'Bearer ' || COALESCE(
                                                 current_setting('app.settings.service_role_key', true),
                                                 'NOT_CONFIGURED'
                                               )
                            ),
    body                 := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- ── Birthday ─────────────────────────────────────────────────────────────────
-- Matches clients whose birthdate month/day equals today. Gate column
-- last_birthday_sent_year prevents sending more than once per calendar year.
SELECT cron.schedule(
  'automation-birthday-daily',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url                  := 'https://mmmkachplbkaxvhauhaa.supabase.co/functions/v1/automation-birthday',
    headers              := jsonb_build_object(
                              'Content-Type',  'application/json',
                              'Authorization', 'Bearer ' || COALESCE(
                                                 current_setting('app.settings.service_role_key', true),
                                                 'NOT_CONFIGURED'
                                               )
                            ),
    body                 := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- ── Verify ───────────────────────────────────────────────────────────────────
-- After pushing, confirm the jobs are registered:
--   SELECT jobid, jobname, schedule, active FROM cron.job
--   WHERE jobname LIKE 'automation-%';
--
-- Monitor recent run history:
--   SELECT jobid, start_time, end_time, status, return_message
--   FROM cron.job_run_details
--   ORDER BY start_time DESC
--   LIMIT 20;
