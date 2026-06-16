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

  let body: { shopId: string; readerId: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const { shopId, readerId } = body;
  if (!shopId || !readerId) return json({ error: "shopId and readerId are required" }, 400);

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: shop } = await supabase
    .from("shops")
    .select("stripe_account_id")
    .eq("id", shopId)
    .single();

  if (!shop?.stripe_account_id) {
    return json({ error: "Stripe account not connected" }, 400);
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

  try {
    await stripe.terminal.readers.del(
      readerId,
      { stripeAccount: shop.stripe_account_id }
    );

    console.log("[stripe-delete-reader] deleted reader:", readerId);
    return json({ success: true });
  } catch (e) {
    console.error("[stripe-delete-reader] error:", e);
    const message = e instanceof Error ? e.message : String(e);
    return json({ error: message }, 500);
  }
});
