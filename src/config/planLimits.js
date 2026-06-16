// Authoritative plan limits. null = unlimited.
export const PLAN_LIMITS = {
  basic: { maxBarbers: 1,    maxLocations: 1 },
  pro:   { maxBarbers: 10,   maxLocations: 1 },
  elite: { maxBarbers: null, maxLocations: 5 },
};

export const PLAN_NAMES = {
  basic: 'Basic',
  pro:   'Pro',
  elite: 'Elite',
};

export function getPlanLimits(tier) {
  return PLAN_LIMITS[tier] ?? PLAN_LIMITS.basic;
}

export function getPlanName(tier) {
  return PLAN_NAMES[tier] ?? 'Basic';
}
