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
    .select("id, name, email, permission_level, shop_id")
    .eq("user_id", caller.id)
    .maybeSingle();

  const isOwnerTier = callerBarber?.permission_level === "owner";
  const isAdminTier =
    callerBarber?.permission_level === "superadmin" || isOwnerTier;

  if (!isAdminTier) {
    return json({ error: "Forbidden: admin access required" }, 403);
  }

  let body: {
    action?: string;
    name?: string;
    email?: string;
    barber_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  // Helper — logs to admin_activity_log via service role (bypasses RLS)
  const log = (opts: {
    action_type: string;
    target_type?: string;
    target_id?: string;
    target_label?: string;
    old_value?: unknown;
    new_value?: unknown;
  }) =>
    supabaseAdmin.from("admin_activity_log").insert({
      actor_user_id: caller.id,
      actor_name: callerBarber?.name ?? "Unknown",
      actor_email: callerBarber?.email ?? "unknown",
      ...opts,
    }).then(({ error }) => {
      if (error) console.error("[inviteSuperadmin] activity log insert failed:", error.message);
    });

  // Helper — returns current platform admin list
  const listAdmins = () =>
    supabaseAdmin
      .from("barbers")
      .select("id, name, email, created_at, permission_level")
      .in("permission_level", ["superadmin", "owner"])
      .is("shop_id", null)
      .order("created_at", { ascending: true });

  // ── LIST (superadmin OR owner) ─────────────────────────────────────────────
  if (body.action === "list") {
    const { data, error } = await listAdmins();
    if (error) return json({ error: error.message }, 500);
    return json({ admins: data ?? [] });
  }

  // All remaining actions require owner tier
  if (!isOwnerTier) {
    return json({ error: "Forbidden: owner access required" }, 403);
  }

  // ── RESET PASSWORD ────────────────────────────────────────────────────────
  if (body.action === "reset") {
    const { barber_id } = body;
    if (!barber_id) return json({ error: "barber_id is required" }, 400);

    const { data: barber } = await supabaseAdmin
      .from("barbers")
      .select("user_id, name, email")
      .eq("id", barber_id)
      .maybeSingle();

    if (!barber?.user_id) return json({ error: "Barber not found or has no auth account" }, 400);

    const tempPassword = generateTempPassword();
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      barber.user_id,
      { password: tempPassword, user_metadata: { must_change_password: true } }
    );
    if (updateError) {
      console.error("Password reset error:", updateError.message);
      return json({ error: `Failed to reset password: ${updateError.message}` }, 500);
    }

    await log({
      action_type: "password_reset_triggered",
      target_type: "barber",
      target_id: barber_id,
      target_label: `${barber.name} (${barber.email})`,
    });

    return json({ success: true, temp_password: tempPassword });
  }

  // ── REMOVE ADMIN ACCESS ───────────────────────────────────────────────────
  if (body.action === "delete") {
    const { barber_id } = body;
    if (!barber_id) return json({ error: "barber_id is required" }, 400);

    // Prevent self-deletion
    if (barber_id === callerBarber?.id) {
      return json({ error: "You cannot remove your own admin access." }, 400);
    }

    const { data: target, error: lookupError } = await supabaseAdmin
      .from("barbers")
      .select("id, name, email, permission_level, shop_id, user_id")
      .eq("id", barber_id)
      .maybeSingle();

    if (lookupError || !target) return json({ error: "Account not found" }, 404);
    if (target.shop_id !== null) {
      return json({ error: "Cannot remove access from a shop-associated account via this panel." }, 400);
    }

    const oldLevel = target.permission_level;

    const { error: deleteError } = await supabaseAdmin
      .from("barbers")
      .delete()
      .eq("id", barber_id);

    if (deleteError) {
      console.error("Delete barber error:", deleteError.message);
      return json({ error: `Failed to remove access: ${deleteError.message}` }, 500);
    }

    // Also disable the auth user so they can't log in
    if (target.user_id) {
      await supabaseAdmin.auth.admin.updateUserById(target.user_id, {
        ban_duration: "876600h", // ~100 years
      });
    }

    await log({
      action_type: "superadmin_deleted",
      target_type: "barber",
      target_id: barber_id,
      target_label: `${target.name} (${target.email})`,
      old_value: { permission_level: oldLevel },
    });

    const { data: updatedList } = await listAdmins();
    return json({ success: true, admins: updatedList ?? [] });
  }

  // ── PROMOTE TO OWNER ──────────────────────────────────────────────────────
  if (body.action === "promote") {
    const { barber_id } = body;
    if (!barber_id) return json({ error: "barber_id is required" }, 400);

    const { data: target, error: lookupError } = await supabaseAdmin
      .from("barbers")
      .select("id, name, email, permission_level")
      .eq("id", barber_id)
      .maybeSingle();

    if (lookupError || !target) return json({ error: "Account not found" }, 404);
    if (target.permission_level === "owner") {
      return json({ error: `${target.name} is already an Owner.` }, 400);
    }

    const { error: updateError } = await supabaseAdmin
      .from("barbers")
      .update({ permission_level: "owner" })
      .eq("id", barber_id);

    if (updateError) {
      console.error("Promote error:", updateError.message);
      return json({ error: `Failed to promote account: ${updateError.message}` }, 500);
    }

    await log({
      action_type: "promoted_to_owner",
      target_type: "barber",
      target_id: barber_id,
      target_label: `${target.name} (${target.email})`,
      old_value: { permission_level: target.permission_level },
      new_value: { permission_level: "owner" },
    });

    const { data: updatedList } = await listAdmins();
    return json({ success: true, admins: updatedList ?? [] });
  }

  // ── DEMOTE OWNER TO SUPERADMIN ────────────────────────────────────────────
  if (body.action === "demote") {
    const { barber_id } = body;
    if (!barber_id) return json({ error: "barber_id is required" }, 400);

    if (barber_id === callerBarber?.id) {
      return json({ error: "You cannot demote your own account." }, 400);
    }

    const { data: target, error: lookupError } = await supabaseAdmin
      .from("barbers")
      .select("id, name, email, permission_level")
      .eq("id", barber_id)
      .maybeSingle();

    if (lookupError || !target) return json({ error: "Account not found" }, 404);
    if (target.permission_level !== "owner") {
      return json({ error: `${target.name} is not an Owner.` }, 400);
    }

    const { error: updateError } = await supabaseAdmin
      .from("barbers")
      .update({ permission_level: "superadmin" })
      .eq("id", barber_id);

    if (updateError) {
      console.error("Demote error:", updateError.message);
      return json({ error: `Failed to demote account: ${updateError.message}` }, 500);
    }

    await log({
      action_type: "demoted_to_superadmin",
      target_type: "barber",
      target_id: barber_id,
      target_label: `${target.name} (${target.email})`,
      old_value: { permission_level: "owner" },
      new_value: { permission_level: "superadmin" },
    });

    const { data: updatedList } = await listAdmins();
    return json({ success: true, admins: updatedList ?? [] });
  }

  // ── INVITE (create new superadmin with temp password) ─────────────────────
  if (body.action !== "invite") {
    return json({ error: "action must be list, invite, reset, delete, or promote" }, 400);
  }

  const { name, email } = body;
  if (!name?.trim() || !email?.trim()) {
    return json({ error: "name and email are required" }, 400);
  }

  const tempPassword = generateTempPassword();
  let authUserId: string;
  let alreadyExisted = false;

  const { data: createData, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
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

    alreadyExisted = true;
    const { data: listData, error: listError } =
      await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
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

  // Create or promote their barbers row
  const { data: existingBarber, error: lookupError } = await supabaseAdmin
    .from("barbers")
    .select("id, permission_level")
    .eq("email", email.trim())
    .maybeSingle();

  if (lookupError) {
    console.error("Barber lookup error:", lookupError.message);
    return json({ error: `Barber lookup failed: ${lookupError.message}` }, 500);
  }

  let newBarberId: string;

  if (existingBarber) {
    const { error: updateError } = await supabaseAdmin
      .from("barbers")
      .update({ permission_level: "superadmin", user_id: authUserId, name: name.trim() })
      .eq("id", existingBarber.id);
    if (updateError) {
      console.error("Barber update error:", updateError.message);
      return json({ error: `Failed to promote account: ${updateError.message}` }, 500);
    }
    newBarberId = existingBarber.id;
  } else {
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("barbers")
      .insert({
        name: name.trim(),
        email: email.trim(),
        permission_level: "superadmin",
        user_id: authUserId,
        is_active: true,
        online_bookable: false,
      })
      .select("id")
      .single();
    if (insertError) {
      console.error("Barber insert error:", insertError.message);
      return json({ error: `Failed to create barber record: ${insertError.message}` }, 500);
    }
    newBarberId = inserted.id;
  }

  await log({
    action_type: "superadmin_created",
    target_type: "barber",
    target_id: newBarberId,
    target_label: `${name.trim()} (${email.trim()})`,
    new_value: { permission_level: "superadmin", email: email.trim(), already_existed: alreadyExisted },
  });

  const { data: updatedList } = await listAdmins();
  return json({
    success: true,
    already_existed: alreadyExisted,
    temp_password: tempPassword,
    admins: updatedList ?? [],
  });
});
