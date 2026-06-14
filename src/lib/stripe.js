import { loadStripe } from '@stripe/stripe-js';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!publishableKey) {
  console.error(
    '[Stripe] VITE_STRIPE_PUBLISHABLE_KEY must be set in your .env file.'
  );
}

export const stripePromise = loadStripe(publishableKey ?? '');

export const PRICES = {
  basic: import.meta.env.VITE_STRIPE_PRICE_BASIC,
  pro: import.meta.env.VITE_STRIPE_PRICE_PRO,
  elite: import.meta.env.VITE_STRIPE_PRICE_ELITE,
};
