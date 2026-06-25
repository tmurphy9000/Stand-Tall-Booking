-- Superadmin barbers are not tied to any shop, so shop_id must be nullable.
-- Safe no-op if the column is already nullable.
ALTER TABLE public.barbers ALTER COLUMN shop_id DROP NOT NULL;
