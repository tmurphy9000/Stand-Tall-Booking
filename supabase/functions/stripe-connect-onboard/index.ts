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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!secretKey || !supabaseUrl || !serviceRoleKey) {
    return json({ error: "Server configuration error" }, 500);
  }

  let body: { shopId: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const { shopId } = body;
  if (!shopId) return json({ error: "shopId is required" }, 400);

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: shop } = await supabase
    .from("shops")
    .select("stripe_account_id")
    .eq("id", shopId)
    .single();

  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

  let stripeAccountId = shop?.stripe_account_id;

  if (!stripeAccountId) {
    try {
      const account = await stripe.accounts.create({
        type: "standard",
        metadata: { shopId },
      });
      stripeAccountId = account.id;

      const { error: dbError } = await supabase
        .from("shops")
        .update({ stripe_account_id: stripeAccountId, stripe_connect_status: "pending" })
        .eq("id", shopId);

      if (dbError) {
        console.error("[stripe-connect-onboard] DB error:", dbError);
        return json({ error: "Failed to save Stripe account" }, 500);
      }

      console.log("[stripe-connect-onboard] created account:", stripeAccountId, "for shop:", shopId);
    } catch (e) {
      console.error("[stripe-connect-onboard] account create error:", e);
      return json({ error: e instanceof Error ? e.message : String(e) }, 500);
    }
  }

  try {
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      type: "account_onboarding",
      refresh_url: "https://standtallbooking.com/Settings?tab=payments&stripe=refresh",
      return_url: "https://standtallbooking.com/Settings?tab=payments&stripe=success",
    });

    console.log("[stripe-connect-onboard] created account link for:", stripeAccountId);
    return json({ url: accountLink.url });
  } catch (e) {
    console.error("[stripe-connect-onboard] account link error:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
