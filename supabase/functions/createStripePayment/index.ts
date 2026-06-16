import Stripe from "https://esm.sh/stripe@22.2.1?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!secretKey) {
    console.error("[createStripePayment] missing STRIPE_SECRET_KEY");
    return json({ error: "Server configuration error: missing STRIPE_SECRET_KEY" }, 500);
  }

  let body: { amount: number; description?: string; metadata?: Record<string, string>; shopId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const { amount, description, metadata, shopId } = body;
  if (!amount || amount < 50) {
    return json({ error: "amount must be at least 50 cents" }, 400);
  }

  // If shopId provided, look up the shop's connected Stripe account
  let stripeAccountId: string | null = null;
  if (shopId && supabaseUrl && serviceRoleKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const { data: shop } = await supabase
        .from("shops")
        .select("stripe_account_id")
        .eq("id", shopId)
        .single();
      stripeAccountId = shop?.stripe_account_id ?? null;
      console.log("[createStripePayment] shopId:", shopId, "stripeAccountId:", stripeAccountId ? "found" : "none");
    } catch (e) {
      console.warn("[createStripePayment] shop lookup failed:", e);
    }
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

  const piParams: Stripe.PaymentIntentCreateParams = {
    amount,
    currency: "usd",
    description: description ?? "Stand Tall Barbershop",
    metadata: metadata ?? {},
  };

  // Destination charge: funds flow directly to the connected account.
  // Uses platform publishable key on the client — no client-side changes needed.
  if (stripeAccountId) {
    piParams.on_behalf_of = stripeAccountId;
    piParams.transfer_data = { destination: stripeAccountId };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create(piParams);
    console.log("[createStripePayment] created PaymentIntent:", paymentIntent.id);
    return json({ clientSecret: paymentIntent.client_secret });
  } catch (e) {
    console.error("[createStripePayment] Stripe error:", e);
    const message = e instanceof Error ? e.message : String(e);
    return json({ error: message }, 500);
  }
});
