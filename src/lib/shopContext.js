import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

// The placeholder UUID seeded during the multi-tenancy migration.
// Any value equal to this is treated as "not set" in all resolution paths.
const PLACEHOLDER_SHOP_ID = '00000000-0000-0000-0000-000000000001';

function validShopId(id) {
  return id && id !== PLACEHOLDER_SHOP_ID ? id : null;
}

export function useShop() {
  // Derive the user from AuthContext instead of calling getSession() directly.
  // AuthContext uses onAuthStateChange, so it correctly handles session
  // restoration on page load. A one-shot getSession() call can return null
  // during the async restore window and never re-run (empty dep array),
  // leaving shopId permanently null for the lifetime of the component.
  const { user, isLoadingAuth } = useAuth();

  const [shopId, setShopId] = useState(null);
  const [tier, setTier] = useState(null);
  const [status, setStatus] = useState(null);
  const [stripeAccountId, setStripeAccountId] = useState(null);
  const [depositsEnabled, setDepositsEnabled] = useState(false);
  const [depositAmount, setDepositAmount] = useState(0);
  const [stripeTerminalLocationId, setStripeTerminalLocationId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('[useShop] effect run — user?.id:', user?.id ?? 'NULL', '| isLoadingAuth:', isLoadingAuth);
    // Wait for AuthContext to finish restoring the session before we try to
    // load the shop — avoids acting on a transiently-null user.
    if (isLoadingAuth) {
      console.log('[useShop] still loading auth, waiting...');
      return;
    }

    if (!user) {
      console.log('[useShop] isLoadingAuth=false but user is NULL — exiting without loading shop');
      setIsLoading(false);
      return;
    }

    console.log('[useShop] user confirmed, calling loadShop() for user.id:', user.id);
    let isMounted = true;

    const loadShop = async () => {
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('shop_id, tier, status')
        .eq('user_id', user.id)
        .maybeSingle();
      console.log('[useShop] subscriptions query result — data:', subscription, '| error:', subError);

      // Prefer the subscriptions table (always DB-authoritative) over
      // user_metadata embedded in the JWT, which can be stale.
      // Explicitly reject the legacy placeholder UUID at every step.
      const resolvedShopId =
        validShopId(subscription?.shop_id) ??
        validShopId(user.user_metadata?.shop_id) ??
        null;
      console.log('[useShop] resolvedShopId:', resolvedShopId, '| user_metadata.shop_id:', user.user_metadata?.shop_id);

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
  }, [user?.id, isLoadingAuth]);

  return { shopId, tier, status, stripeAccountId, depositsEnabled, depositAmount, stripeTerminalLocationId, isLoading };
}
