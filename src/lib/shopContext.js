import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

// The placeholder UUID seeded during the multi-tenancy migration.
// Any value equal to this is treated as "not set" in all resolution paths.
const PLACEHOLDER_SHOP_ID = '00000000-0000-0000-0000-000000000001';

function validShopId(id) {
  return id && id !== PLACEHOLDER_SHOP_ID ? id : null;
}

export function useShop() {
  const [shopId, setShopId] = useState(null);
  const [tier, setTier] = useState(null);
  const [status, setStatus] = useState(null);
  const [stripeAccountId, setStripeAccountId] = useState(null);
  const [depositsEnabled, setDepositsEnabled] = useState(false);
  const [depositAmount, setDepositAmount] = useState(0);
  const [stripeTerminalLocationId, setStripeTerminalLocationId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadShop = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        if (isMounted) setIsLoading(false);
        return;
      }

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('shop_id, tier, status')
        .eq('user_id', user.id)
        .maybeSingle();

      // Prefer the subscriptions table (always DB-authoritative) over
      // user_metadata embedded in the JWT, which can be stale.
      // Explicitly reject the legacy placeholder UUID at every step — it is
      // not a real shop and will cause downstream queries to return no rows.
      const resolvedShopId =
        validShopId(subscription?.shop_id) ??
        validShopId(user.user_metadata?.shop_id) ??
        null;

      // Load Stripe Connect info and deposit config from shops table
      if (resolvedShopId) {
        const { data: shopData } = await supabase
          .from('shops')
          .select('stripe_account_id, deposits_enabled, deposit_amount, stripe_terminal_location_id')
          .eq('id', resolvedShopId)
          .single();

        if (isMounted) {
          setStripeAccountId(shopData?.stripe_account_id ?? null);
          setDepositsEnabled(shopData?.deposits_enabled ?? false);
          setDepositAmount(shopData?.deposit_amount ?? 0);
          setStripeTerminalLocationId(shopData?.stripe_terminal_location_id ?? null);
        }
      }

      if (!isMounted) return;
      setShopId(resolvedShopId);
      setTier(subscription?.tier ?? null);
      setStatus(subscription?.status ?? null);
      setIsLoading(false);
    };

    loadShop();

    return () => {
      isMounted = false;
    };
  }, []);

  return { shopId, tier, status, stripeAccountId, depositsEnabled, depositAmount, stripeTerminalLocationId, isLoading };
}
