-- Marketing Phase 4: automation support columns
-- Adds marketing_settings JSONB to shop_settings for per-shop automation config.
-- Adds three gate columns to clients to prevent duplicate automation sends.

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS marketing_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- review_request_sent_at: set before sending; null means never sent (once per client, ever)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS review_request_sent_at  timestamptz,
  ADD COLUMN IF NOT EXISTS last_winback_sent_at    timestamptz,
  ADD COLUMN IF NOT EXISTS last_birthday_sent_year integer;

-- Index for birthday cron (month+day match across all clients)
CREATE INDEX IF NOT EXISTS clients_birthdate_month_day
  ON public.clients (EXTRACT(MONTH FROM birthdate), EXTRACT(DAY FROM birthdate))
  WHERE birthdate IS NOT NULL;
