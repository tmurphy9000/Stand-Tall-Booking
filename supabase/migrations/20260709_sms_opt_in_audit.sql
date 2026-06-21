ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS sms_opt_in_updated_by  text,
  ADD COLUMN IF NOT EXISTS sms_opt_in_updated_at  timestamptz;
