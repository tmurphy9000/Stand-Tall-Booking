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

  if (!secretKey || !supabaseUrl || !serviceRoleKey) {
    return json({ error: "Server configuration error" }, 500);
  }

  let body: { code: string; shopId: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const { code, shopId } = body;
  if (!code || !shopId) {
    return json({ error: "code and shopId are required" }, 400);
  }

  console.log("[stripe-connect-callback] exchanging code for shopId:", shopId);

  // Exchange the authorization code for the connected account's stripe_user_id
  const tokenResponse = await fetch("https://connect.stripe.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_secret: secretKey,
      code,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenResponse.json();
  console.log("[stripe-connect-callback] token response error:", tokenData.error ?? "none");

  if (tokenData.error) {
    return json({ error: tokenData.error_description || tokenData.error }, 400);
  }

  const stripeAccountId: string = tokenData.stripe_user_id;
  if (!stripeAccountId) {
    return json({ error: "No stripe_user_id in OAuth response" }, 500);
  }

  // Persist to shops table using service role (bypasses RLS)
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { error: dbError } = await supabase
    .from("shops")
    .update({
      stripe_account_id: stripeAccountId,
      stripe_connect_status: "active",
    })
    .eq("id", shopId);

  if (dbError) {
    console.error("[stripe-connect-callback] DB error:", dbError);
    return json({ error: "Failed to save Stripe account to database" }, 500);
  }

  console.log("[stripe-connect-callback] saved stripeAccountId:", stripeAccountId, "for shop:", shopId);
  return json({ success: true, stripeAccountId });
});
