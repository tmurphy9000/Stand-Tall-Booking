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

  if (!shop?.stripe_account_id) {
    return json({ error: "No Stripe account found for this shop" }, 400);
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

  try {
    const account = await stripe.accounts.retrieve(shop.stripe_account_id);
    const status = account.details_submitted && account.charges_enabled ? "active" : "pending";

    await supabase
      .from("shops")
      .update({ stripe_connect_status: status })
      .eq("id", shopId);

    console.log("[stripe-connect-status] account:", shop.stripe_account_id, "status:", status);
    return json({
      stripeAccountId: shop.stripe_account_id,
      status,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
    });
  } catch (e) {
    console.error("[stripe-connect-status] error:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
