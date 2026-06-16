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

  let body: { shopId: string; shopName?: string; address?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const { shopId, shopName, address } = body;
  if (!shopId) return json({ error: "shopId is required" }, 400);

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: shop } = await supabase
    .from("shops")
    .select("stripe_account_id, stripe_terminal_location_id, name")
    .eq("id", shopId)
    .single();

  if (!shop?.stripe_account_id) {
    return json({ error: "Stripe account not connected. Connect your Stripe account in Settings → Payments first." }, 400);
  }

  // Return existing location without re-creating it
  if (shop.stripe_terminal_location_id) {
    return json({ locationId: shop.stripe_terminal_location_id });
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

  try {
    const location = await stripe.terminal.locations.create({
      display_name: shopName || shop.name || "Stand Tall Barbershop",
      address: {
        country: address?.country ?? "US",
        line1: address?.line1 ?? "",
        city: address?.city ?? "",
        state: address?.state ?? "",
        postal_code: address?.postal_code ?? "",
      },
    }, { stripeAccount: shop.stripe_account_id });

    await supabase
      .from("shops")
      .update({ stripe_terminal_location_id: location.id })
      .eq("id", shopId);

    console.log("[stripe-terminal-location] created location:", location.id);
    return json({ locationId: location.id });
  } catch (e) {
    console.error("[stripe-terminal-location] error:", e);
    const message = e instanceof Error ? e.message : String(e);
    return json({ error: message }, 500);
  }
});
