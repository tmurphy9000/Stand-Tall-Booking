import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, description, metadata } = await req.json();

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      description,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return Response.json({ 
      clientSecret: paymentIntent.client_secret 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});