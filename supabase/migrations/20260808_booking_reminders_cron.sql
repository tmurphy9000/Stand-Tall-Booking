-- Hourly pg_cron job: fires the send-booking-reminders edge function.
-- The function finds all scheduled bookings 22-26h from now and sends
-- a reminder SMS to opted-in clients. The 4-hour window ensures each
-- appointment is caught exactly once by the hourly job.
--
-- Uses the same vault secret as the marketing automation cron jobs.
-- Ensure 'marketing_service_role_key' is set in vault.secrets (see
-- 20260716_marketing_cron_vault_auth.sql for setup instructions).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'send-booking-reminders-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url                  := 'https://mmmkachplbkaxvhauhaa.supabase.co/functions/v1/send-booking-reminders',
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
