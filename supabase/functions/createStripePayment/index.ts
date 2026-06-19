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
  console.log("[createStripePayment] STRIPE_SECRET_KEY present, prefix:", secretKey.slice(0, 12));

  let body: {
    amount: number;
    description?: string;
    metadata?: Record<string, string>;
    shopId?: string;
    terminal?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const { amount, description, metadata, shopId, terminal } = body;
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

  try {
    // Terminal (card_present) — direct charge on connected account
    if (terminal && stripeAccountId) {
      const piParams: Stripe.PaymentIntentCreateParams = {
        amount,
        currency: "usd",
        payment_method_types: ["card_present"],
        capture_method: "automatic",
        description: description ?? "Stand Tall Barbershop",
        metadata: metadata ?? {},
      };
      console.log("[createStripePayment] Terminal path — params:", JSON.stringify(piParams), "stripeAccount:", stripeAccountId);
      const paymentIntent = await stripe.paymentIntents.create(piParams, {
        stripeAccount: stripeAccountId,
      });
      console.log("[createStripePayment] Terminal PI — id:", paymentIntent.id, "status:", paymentIntent.status, "livemode:", paymentIntent.livemode);
      return json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
    }

    // Online / manual card — destination charge so funds flow to connected account
    const piParams: Stripe.PaymentIntentCreateParams = {
      amount,
      currency: "usd",
      description: description ?? "Stand Tall Barbershop",
      metadata: metadata ?? {},
    };

    if (stripeAccountId) {
      piParams.on_behalf_of = stripeAccountId;
      piParams.transfer_data = { destination: stripeAccountId };
    }

    console.log("[createStripePayment] calling stripe.paymentIntents.create with params:", JSON.stringify(piParams));
    const paymentIntent = await stripe.paymentIntents.create(piParams);
    console.log("[createStripePayment] Stripe raw response — id:", paymentIntent.id, "status:", paymentIntent.status, "client_secret prefix:", paymentIntent.client_secret?.slice(0, 30), "livemode:", paymentIntent.livemode, "amount:", paymentIntent.amount, "currency:", paymentIntent.currency);
    return json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (e) {
    console.error("[createStripePayment] Stripe error:", e);
    const message = e instanceof Error ? e.message : String(e);
    return json({ error: message }, 500);
  }
});
