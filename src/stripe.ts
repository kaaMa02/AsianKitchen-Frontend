import { loadStripe } from '@stripe/stripe-js';

const pk = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
if (!pk) {
  // Useful guard during dev
  // eslint-disable-next-line no-console
  console.error('Missing REACT_APP_STRIPE_PUBLISHABLE_KEY');
}

export const stripePromise = pk ? loadStripe(pk) : Promise.resolve(null);
