-- Add leaderboard_visible flag to shop_settings.
-- Defaults true so existing shops are unaffected.
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS leaderboard_visible boolean DEFAULT true;
