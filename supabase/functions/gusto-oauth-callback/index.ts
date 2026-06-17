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

const gustoClientId = Deno.env.get("GUSTO_CLIENT_ID");
const gustoClientSecret = Deno.env.get("GUSTO_CLIENT_SECRET");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!gustoClientId || !gustoClientSecret || !supabaseUrl || !serviceRoleKey) {
    return json({ error: "Server configuration error" }, 500);
  }

  let body: { code: string; shopId: string; redirectUri: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const { code, shopId, redirectUri } = body;
  if (!code || !shopId || !redirectUri) {
    return json({ error: "code, shopId, and redirectUri are required" }, 400);
  }

  console.log("[gusto-oauth-callback] exchanging code for shopId:", shopId);

  // TODO: switch to api.gusto.com once the app is approved for production in the Gusto developer dashboard
  const GUSTO_BASE = "https://api.gusto-demo.com";

  // Exchange authorization code for access + refresh tokens
  const tokenRes = await fetch(`${GUSTO_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: gustoClientId,
      client_secret: gustoClientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json();
  console.log("[gusto-oauth-callback] token response status:", tokenRes.status);

  if (!tokenRes.ok || tokenData.error) {
    console.error("[gusto-oauth-callback] token error:", tokenData);
    return json({ error: tokenData.error_description || tokenData.error || "Failed to exchange code" }, 400);
  }

  const { access_token, refresh_token } = tokenData;
  if (!access_token || !refresh_token) {
    return json({ error: "Incomplete token response from Gusto" }, 500);
  }

  // Fetch company info from Gusto to get company UUID and name
  let companyUuid: string | null = null;
  let companyName: string | null = null;
  try {
    const meRes = await fetch(`${GUSTO_BASE}/v1/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (meRes.ok) {
      const meData = await meRes.json();
      // Gusto returns roles.payroll_admin.companies[] on the /v1/me endpoint
      const companies =
        meData?.roles?.payroll_admin?.companies ??
        meData?.companies ??
        [];
      if (companies.length > 0) {
        companyUuid = companies[0].uuid ?? companies[0].id ?? null;
        companyName = companies[0].name ?? companies[0].trade_name ?? null;
      }
    }
  } catch (e) {
    console.warn("[gusto-oauth-callback] could not fetch /v1/me:", e);
  }

  console.log("[gusto-oauth-callback] company:", companyName, companyUuid);

  // Upsert into gusto_connections using service role (bypasses RLS)
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { error: dbError } = await supabase
    .from("gusto_connections")
    .upsert(
      {
        shop_id: shopId,
        access_token,
        refresh_token,
        company_uuid: companyUuid,
        company_name: companyName,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "shop_id" }
    );

  if (dbError) {
    console.error("[gusto-oauth-callback] DB error:", dbError);
    return json({ error: "Failed to save Gusto connection" }, 500);
  }

  return json({ success: true, companyName });
});
