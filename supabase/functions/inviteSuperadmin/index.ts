import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Verify caller is authenticated
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const callerClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller) return json({ error: "Unauthorized" }, 401);

  // Verify caller is superadmin — check their barbers row directly
  const { data: callerBarber } = await supabaseAdmin
    .from("barbers")
    .select("permission_level")
    .eq("user_id", caller.id)
    .maybeSingle();

  if (callerBarber?.permission_level !== "superadmin") {
    return json({ error: "Forbidden: superadmin access required" }, 403);
  }

  let body: { action?: string; name?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  // ── LIST action ──────────────────────────────────────────────
  if (body.action === "list") {
    const { data, error } = await supabaseAdmin
      .from("barbers")
      .select("id, name, email, created_at")
      .eq("permission_level", "superadmin")
      .order("created_at", { ascending: true });

    if (error) return json({ error: error.message }, 500);
    return json({ superadmins: data ?? [] });
  }

  // ── INVITE action ────────────────────────────────────────────
  if (body.action !== "invite") {
    return json({ error: "action must be 'list' or 'invite'" }, 400);
  }

  const { name, email } = body;
  if (!name?.trim() || !email?.trim()) {
    return json({ error: "name and email are required" }, 400);
  }

  // Step 1: Create auth user via invite email (they set their own password via the link).
  let authUserId: string;
  let alreadyExisted = false;

  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email.trim(),
    { redirectTo: "https://www.standtallbooking.com/ChangePassword" }
  );

  if (inviteError) {
    const isExisting =
      inviteError.message.toLowerCase().includes("already been registered") ||
      inviteError.message.toLowerCase().includes("already registered") ||
      inviteError.message.toLowerCase().includes("already exists") ||
      inviteError.message.toLowerCase().includes("duplicate");

    if (!isExisting) {
      return json({ error: `Failed to send invite: ${inviteError.message}` }, 500);
    }

    // User already has an auth account — find them and promote
    alreadyExisted = true;
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) return json({ error: "Could not look up existing auth user" }, 500);

    const existing = listData.users.find((u) => u.email === email.trim());
    if (!existing) return json({ error: "Auth user exists but could not be retrieved. Contact support." }, 500);
    authUserId = existing.id;
  } else {
    authUserId = inviteData.user.id;
  }

  // Step 2: Create or promote their barbers row
  const { data: existingBarber, error: lookupError } = await supabaseAdmin
    .from("barbers")
    .select("id, permission_level")
    .eq("email", email.trim())
    .maybeSingle();

  if (lookupError) return json({ error: `Barber lookup failed: ${lookupError.message}` }, 500);

  if (existingBarber) {
    const { error: updateError } = await supabaseAdmin
      .from("barbers")
      .update({ permission_level: "superadmin", user_id: authUserId, name: name.trim() })
      .eq("id", existingBarber.id);

    if (updateError) return json({ error: `Failed to promote account: ${updateError.message}` }, 500);
  } else {
    const { error: insertError } = await supabaseAdmin
      .from("barbers")
      .insert({
        name: name.trim(),
        email: email.trim(),
        permission_level: "superadmin",
        user_id: authUserId,
        shop_id: null,
        is_active: true,
        online_bookable: false,
      });

    if (insertError) return json({ error: `Failed to create account: ${insertError.message}` }, 500);
  }

  // Return updated list along with success so the UI can refresh in one round trip
  const { data: updatedList } = await supabaseAdmin
    .from("barbers")
    .select("id, name, email, created_at")
    .eq("permission_level", "superadmin")
    .order("created_at", { ascending: true });

  return json({ success: true, already_existed: alreadyExisted, superadmins: updatedList ?? [] });
});
