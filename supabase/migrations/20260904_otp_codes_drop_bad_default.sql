-- The previous migration dropped NOT NULL but the bad default UUID is still set,
-- causing the FK violation on every insert. Drop the default so shop_id is NULL
-- when not provided (OTPs are phone-scoped; service role bypasses RLS anyway).

ALTER TABLE public.otp_codes ALTER COLUMN shop_id DROP DEFAULT;
