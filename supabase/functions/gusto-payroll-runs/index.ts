import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// TODO: switch to api.gusto.com once the app is approved for production
const GUSTO_BASE = "https://api.gusto-demo.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Verify JWT and get user
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  const { data: { user }, error: authError } = await adminClient.auth.getUser(jwt);
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  // Resolve shop_id via barbers table
  const { data: barber } = await adminClient
    .from("barbers")
    .select("shop_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!barber?.shop_id) return json({ error: "Shop not found for this user" }, 404);

  // Fetch Gusto connection — tokens are never exposed to the client
  const { data: connection } = await adminClient
    .from("gusto_connections")
    .select("access_token, company_uuid")
    .eq("shop_id", barber.shop_id)
    .maybeSingle();

  if (!connection) return json({ error: "Gusto not connected" }, 404);

  const payrollRes = await fetch(
    `${GUSTO_BASE}/v1/companies/${connection.company_uuid}/payrolls`,
    { headers: { Authorization: `Bearer ${connection.access_token}` } }
  );

  if (!payrollRes.ok) {
    const detail = await payrollRes.text();
    console.error("[gusto-payroll-runs] Gusto error:", payrollRes.status, detail);
    return json({ error: "Failed to fetch payroll runs from Gusto", detail }, payrollRes.status);
  }

  const payrolls = await payrollRes.json();
  return json({ payrolls: Array.isArray(payrolls) ? payrolls : [] });
});
