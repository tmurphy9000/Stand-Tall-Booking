-- Seed demo account subscription row + demo Stripe/deposit state for screenshot capture.
--
-- Three problems fixed here:
--
-- 1. demo@standtallbooking.com (user_id 526eeba9-bde8-4c98-afe5-e6ed67bae2e1) has no
--    subscriptions row. shopContext.js only resolves shop_id from subscriptions (not barbers),
--    so PaymentsSettings.jsx receives shopId=null and its spinner never clears.
--
-- 2. Demo shop has no stripe_account_id, so the Deposits section never renders in
--    Settings → Payments. Set a display-only placeholder so deposit settings are visible.
--
-- 3. Demo card bookings have no stripe_payment_intent_id, so no Refund button appears
--    on the Transactions page. Backfill one card booking so the refund dialog is capturable.

DO $$
DECLARE
  v_demo_user_id  uuid := '526eeba9-bde8-4c98-afe5-e6ed67bae2e1';
  v_shop_id       uuid := '4bb6cc13-e208-42b8-8ef2-6d5ecbb87d59';
  v_settings_id   uuid;
  v_booking_id    uuid;
BEGIN

  -- ── 1. Insert missing subscription row for demo user ─────────────────────────
  INSERT INTO public.subscriptions (user_id, shop_id, tier, status)
  VALUES (v_demo_user_id, v_shop_id, 'elite', 'active')
  ON CONFLICT (user_id) DO UPDATE SET
    shop_id = EXCLUDED.shop_id,
    tier    = EXCLUDED.tier,
    status  = EXCLUDED.status;

  -- ── 2. Set a display-only Stripe account ID on the demo shop ──────────────────
  -- Allows the Deposits and Card Readers sections to render in Settings → Payments
  -- for demo visitors and screenshot capture. Not a real Stripe account.
  UPDATE public.shops
  SET stripe_account_id = 'acct_demo_standtallbooking'
  WHERE id = v_shop_id
    AND stripe_account_id IS NULL;

  -- ── 3. Seed shop_settings for demo shop with deposits enabled ─────────────────
  SELECT id INTO v_settings_id
  FROM public.shop_settings
  WHERE shop_id = v_shop_id
  LIMIT 1;

  IF v_settings_id IS NULL THEN
    INSERT INTO public.shop_settings (
      shop_id, deposit_enabled, deposit_percentage,
      deposit_refund_hours, deposit_pretip_enabled
    )
    VALUES (v_shop_id, true, 25, 24, false);
  ELSE
    UPDATE public.shop_settings
    SET deposit_enabled      = true,
        deposit_percentage   = 25,
        deposit_refund_hours = 24
    WHERE id = v_settings_id;
  END IF;

  -- ── 4. Backfill one card booking with a fake payment intent ID ────────────────
  -- Enables the Refund button on the Transactions page for screenshot capture.
  SELECT id INTO v_booking_id
  FROM public.bookings
  WHERE shop_id                = v_shop_id
    AND payment_method         = 'card'
    AND status                 = 'completed'
    AND stripe_payment_intent_id IS NULL
  ORDER BY date DESC
  LIMIT 1;

  IF v_booking_id IS NOT NULL THEN
    UPDATE public.bookings
    SET stripe_payment_intent_id = 'pi_demo_screenshot_01'
    WHERE id = v_booking_id;
  END IF;

END $$;
