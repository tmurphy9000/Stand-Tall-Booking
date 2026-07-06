-- Walk-in kiosk: replace per-service default with a simple on/off toggle

ALTER TABLE public.shop_settings
  DROP COLUMN IF EXISTS walk_in_default_service_id;

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS walk_in_enabled boolean NOT NULL DEFAULT false;
