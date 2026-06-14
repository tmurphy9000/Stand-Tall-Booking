import Stripe from "https://esm.sh/stripe@22.2.1?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secretKey) {
    console.error("[stripe-subscription] missing STRIPE_SECRET_KEY env var");
    return json({ error: "Server configuration error" }, 500);
  }

  let body: { priceId?: string; plan?: string; customerId?: string };
  try {
    body = await req.json();
  } catch (e) {
    console.error("[stripe-subscription] failed to parse request body:", e);
    return json({ error: "Invalid request body" }, 400);
  }

  const { priceId, plan, customerId } = body;
  if (!customerId) {
    return json({ error: "customerId is required" }, 400);
  }

  let resolvedPriceId = priceId;
  if (plan) {
    const planPriceIds: Record<string, string | undefined> = {
      basic: Deno.env.get("STRIPE_PRICE_BASIC"),
      pro: Deno.env.get("STRIPE_PRICE_PRO"),
      elite: Deno.env.get("STRIPE_PRICE_ELITE"),
    };
    resolvedPriceId = planPriceIds[plan];
    if (!resolvedPriceId) {
      return json({ error: `Unknown plan: ${plan}` }, 400);
    }
  }

  if (!resolvedPriceId) {
    return json({ error: "priceId or plan is required" }, 400);
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

  const origin = req.headers.get("origin") ?? "";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: resolvedPriceId, quantity: 1 }],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });

    return json({ url: session.url });
  } catch (e) {
    console.error("[stripe-subscription] Stripe error:", e);
    return json({ error: "Failed to create checkout session" }, 500);
  }
});
