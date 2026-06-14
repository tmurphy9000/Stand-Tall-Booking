import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Resolves the current user's shop. Prefers shop_id from auth metadata
// (set by the stripe-webhook when a subscription is created) and falls
// back to the subscriptions table for users provisioned before that existed.
export function useShop() {
  const [shopId, setShopId] = useState(null);
  const [tier, setTier] = useState(null);
  const [status, setStatus] = useState(null);
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

      let resolvedShopId = user.user_metadata?.shop_id ?? null;

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('shop_id, tier, status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!resolvedShopId) {
        resolvedShopId = subscription?.shop_id ?? null;
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

  return { shopId, tier, status, isLoading };
}
