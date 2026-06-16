import { useShop } from '@/lib/shopContext';
import { getPlanLimits, getPlanName } from '@/config/planLimits';

/**
 * Returns gate-check functions for the current user's plan.
 *
 * Usage:
 *   const { checkBarberLimit, checkLocationLimit } = usePlanGate();
 *   const result = checkBarberLimit(barbers.length);
 *   if (!result.allowed) { show <PlanGateModal {...result} /> }
 *
 * Each check returns:
 *   { allowed: true }
 *   { allowed: false, feature: 'barbers'|'locations', planName: string, limit: number }
 */
export function usePlanGate() {
  const { tier } = useShop();
  const limits = getPlanLimits(tier);
  const planName = getPlanName(tier);

  function checkBarberLimit(currentCount) {
    const { maxBarbers } = limits;
    if (maxBarbers === null) return { allowed: true };
    if (currentCount >= maxBarbers) {
      return { allowed: false, feature: 'barbers', planName, limit: maxBarbers };
    }
    return { allowed: true };
  }

  function checkLocationLimit(currentCount) {
    const { maxLocations } = limits;
    if (maxLocations === null) return { allowed: true };
    if (currentCount >= maxLocations) {
      return { allowed: false, feature: 'locations', planName, limit: maxLocations };
    }
    return { allowed: true };
  }

  return { checkBarberLimit, checkLocationLimit, limits, planName, tier };
}
