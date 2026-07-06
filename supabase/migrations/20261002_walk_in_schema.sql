-- Walk-in kiosk feature schema additions

-- 1. Add source column to bookings (walk_in | online | staff; nullable)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS source text;

-- 2. Add walk-in default service to shop_settings
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS walk_in_default_service_id uuid
    REFERENCES public.services(id) ON DELETE SET NULL;
