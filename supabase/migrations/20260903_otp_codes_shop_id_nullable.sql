-- otp_codes.shop_id was set NOT NULL with a placeholder default UUID that doesn't
-- exist in the shops table, causing every sendOTP INSERT to fail with a FK violation.
-- OTPs are phone-scoped, not shop-scoped — drop the NOT NULL constraint.

ALTER TABLE public.otp_codes ALTER COLUMN shop_id DROP NOT NULL;
