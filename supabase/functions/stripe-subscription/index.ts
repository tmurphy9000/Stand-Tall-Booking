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

const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
console.log("[stripe-subscription] STRIPE_SECRET_KEY present:", !!secretKey);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!secretKey) {
    console.error("[stripe-subscription] missing STRIPE_SECRET_KEY env var");
    return json({ error: "Server configuration error: missing STRIPE_SECRET_KEY" }, 500);
  }

  let body: { priceId?: string; plan?: string; customerId?: string; customerEmail?: string; affiliate_code?: string };
  try {
    body = await req.json();
  } catch (e) {
    console.error("[stripe-subscription] failed to parse request body:", e);
    return json({ error: "Invalid request body" }, 400);
  }

  const { priceId, plan, customerId, customerEmail, affiliate_code } = body;
  if (!customerId && !customerEmail) {
    return json({ error: "customerId or customerEmail is required" }, 400);
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

  console.log("[stripe-subscription] plan:", plan, "resolvedPriceId:", resolvedPriceId);

  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

  try {
    const sessionMeta: Record<string, string> = {};
    if (plan) sessionMeta.plan = plan;
    if (affiliate_code) sessionMeta.affiliate_code = affiliate_code.trim().toUpperCase();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(customerId ? { customer: customerId } : { customer_email: customerEmail }),
      line_items: [{ price: resolvedPriceId, quantity: 1 }],
      success_url: "https://www.standtallbooking.com?checkout=success",
      cancel_url: "https://www.standtallbooking.com?checkout=cancelled",
      metadata: Object.keys(sessionMeta).length ? sessionMeta : undefined,
      subscription_data: Object.keys(sessionMeta).length ? { metadata: sessionMeta } : undefined,
    });

    return json({ url: session.url });
  } catch (e) {
    console.error("[stripe-subscription] Stripe error:", e);
    const message = e instanceof Error ? e.message : String(e);
    return json({ error: message }, 500);
  }
});
