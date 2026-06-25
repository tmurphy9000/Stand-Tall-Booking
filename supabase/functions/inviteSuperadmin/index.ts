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

// Excludes visually ambiguous chars (0/O, 1/l/I) so the password is easy to read and type.
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

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

  const { data: callerBarber } = await supabaseAdmin
    .from("barbers")
    .select("permission_level")
    .eq("user_id", caller.id)
    .maybeSingle();

  if (callerBarber?.permission_level !== "superadmin") {
    return json({ error: "Forbidden: superadmin access required" }, 403);
  }

  let body: { action?: string; name?: string; email?: string; barber_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  // ── LIST ──────────────────────────────────────────────────────────────────
  if (body.action === "list") {
    const { data, error } = await supabaseAdmin
      .from("barbers")
      .select("id, name, email, created_at")
      .eq("permission_level", "superadmin")
      .order("created_at", { ascending: true });

    if (error) return json({ error: error.message }, 500);
    return json({ superadmins: data ?? [] });
  }

  // ── RESET (generate new temp password for an existing superadmin) ─────────
  if (body.action === "reset") {
    const { barber_id } = body;
    if (!barber_id) return json({ error: "barber_id is required" }, 400);

    const { data: barber } = await supabaseAdmin
      .from("barbers")
      .select("user_id")
      .eq("id", barber_id)
      .maybeSingle();

    if (!barber?.user_id) return json({ error: "Barber not found or has no auth account" }, 400);

    const tempPassword = generateTempPassword();
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(barber.user_id, {
      password: tempPassword,
      user_metadata: { must_change_password: true },
    });

    if (updateError) {
      console.error("Password reset error:", updateError.message);
      return json({ error: `Failed to reset password: ${updateError.message}` }, 500);
    }

    return json({ success: true, temp_password: tempPassword });
  }

  // ── INVITE ────────────────────────────────────────────────────────────────
  if (body.action !== "invite") {
    return json({ error: "action must be 'list', 'invite', or 'reset'" }, 400);
  }

  const { name, email } = body;
  if (!name?.trim() || !email?.trim()) {
    return json({ error: "name and email are required" }, 400);
  }

  const tempPassword = generateTempPassword();
  let authUserId: string;
  let alreadyExisted = false;

  // Create the auth user with a temp password (email_confirm: true skips the verification email).
  // No invite email is sent — the admin delivers the temp password out-of-band.
  const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim(),
    password: tempPassword,
    email_confirm: true,
    user_metadata: { must_change_password: true },
  });

  if (createError) {
    const msg = createError.message.toLowerCase();
    const isExisting =
      msg.includes("already") || msg.includes("exists") || msg.includes("duplicate");

    if (!isExisting) {
      console.error("createUser error:", createError.message);
      return json({ error: `Failed to create account: ${createError.message}` }, 500);
    }

    // User already has an auth account — reset their password and set the flag
    alreadyExisted = true;
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) return json({ error: "Could not look up existing auth user" }, 500);

    const existing = listData.users.find((u) => u.email === email.trim());
    if (!existing) return json({ error: "Auth user exists but could not be retrieved." }, 500);
    authUserId = existing.id;

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      password: tempPassword,
      user_metadata: { must_change_password: true },
    });
    if (updateError) {
      console.error("updateUserById error:", updateError.message);
      return json({ error: `Failed to update existing account: ${updateError.message}` }, 500);
    }
  } else {
    authUserId = createData.user.id;
  }

  // Create or promote the barbers row
  const { data: existingBarber, error: lookupError } = await supabaseAdmin
    .from("barbers")
    .select("id, permission_level")
    .eq("email", email.trim())
    .maybeSingle();

  if (lookupError) {
    console.error("Barber lookup error:", lookupError.message);
    return json({ error: `Barber lookup failed: ${lookupError.message}` }, 500);
  }

  if (existingBarber) {
    const { error: updateError } = await supabaseAdmin
      .from("barbers")
      .update({ permission_level: "superadmin", user_id: authUserId, name: name.trim() })
      .eq("id", existingBarber.id);

    if (updateError) {
      console.error("Barber update error:", updateError.message);
      return json({ error: `Failed to promote account: ${updateError.message}` }, 500);
    }
  } else {
    const { error: insertError } = await supabaseAdmin
      .from("barbers")
      .insert({
        name: name.trim(),
        email: email.trim(),
        permission_level: "superadmin",
        user_id: authUserId,
        is_active: true,
        online_bookable: false,
      });

    if (insertError) {
      console.error("Barber insert error:", insertError.message);
      return json({ error: `Failed to create barber record: ${insertError.message}` }, 500);
    }
  }

  const { data: updatedList } = await supabaseAdmin
    .from("barbers")
    .select("id, name, email, created_at")
    .eq("permission_level", "superadmin")
    .order("created_at", { ascending: true });

  return json({
    success: true,
    already_existed: alreadyExisted,
    temp_password: tempPassword,
    superadmins: updatedList ?? [],
  });
});
