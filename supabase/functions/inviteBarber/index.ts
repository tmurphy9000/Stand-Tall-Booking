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

  // Verify the caller is authenticated
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    console.error("[inviteBarber] Missing Authorization header");
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Verify the calling user is authenticated
  const callerClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller) {
    console.error("[inviteBarber] Auth verification failed:", callerError?.message);
    return json({ error: "Unauthorized" }, 401);
  }
  console.log("[inviteBarber] Called by user:", caller.email);

  // Parse request body
  let body: { name?: string; email?: string; phone?: string; permission_level?: string; temp_password?: string };
  try {
    body = await req.json();
  } catch (e) {
    console.error("[inviteBarber] Failed to parse request body:", e);
    return json({ error: "Invalid request body" });
  }

  const { name, email, phone, permission_level, temp_password } = body;
  console.log("[inviteBarber] Inviting barber:", { name, email, phone, permission_level });

  if (!name || !email || !temp_password) {
    console.error("[inviteBarber] Missing required fields:", { name: !!name, email: !!email, temp_password: !!temp_password });
    return json({ error: "name, email, and temp_password are required" });
  }

  // Step 1: Resolve auth user — create if new, find existing if already registered.
  // Auth is done first so there is nothing to roll back if it fails.
  let authUserId: string;

  const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: temp_password,
    email_confirm: true,
  });

  if (createError) {
    const alreadyExists =
      createError.message.toLowerCase().includes("already been registered") ||
      createError.message.toLowerCase().includes("already registered") ||
      createError.message.toLowerCase().includes("already exists") ||
      createError.message.toLowerCase().includes("duplicate");

    if (!alreadyExists) {
      console.error("[inviteBarber] Failed to create auth user:", createError.message);
      return json({ error: `Failed to create auth account: ${createError.message}` });
    }

    console.log("[inviteBarber] Auth user already exists, looking up by email:", email);
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) {
      console.error("[inviteBarber] Failed to list auth users:", listError.message);
      return json({ error: `Could not look up existing auth user: ${listError.message}` });
    }

    const existing = listData.users.find((u) => u.email === email);
    if (!existing) {
      console.error("[inviteBarber] Auth user said it exists but could not be found in list");
      return json({ error: "Auth user already registered but could not be retrieved. Contact support." });
    }

    authUserId = existing.id;
    console.log("[inviteBarber] Found existing auth user:", authUserId);
  } else {
    authUserId = createData.user.id;
    console.log("[inviteBarber] Created new auth user:", authUserId);
  }

  // Step 2: Resolve barber record — update if already exists, create (with user_id) if not.
  const { data: existingBarber, error: lookupError } = await supabaseAdmin
    .from("barbers")
    .select("id, user_id")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    console.error("[inviteBarber] Failed to look up barber record:", lookupError.message);
    return json({ error: `Failed to look up barber record: ${lookupError.message}` });
  }

  let barberId: string;

  if (existingBarber) {
    barberId = existingBarber.id;
    if (existingBarber.user_id !== authUserId) {
      console.log("[inviteBarber] Barber record exists, linking auth user_id:", authUserId);
      const { error: linkError } = await supabaseAdmin
        .from("barbers")
        .update({ user_id: authUserId })
        .eq("id", barberId);
      if (linkError) {
        console.error("[inviteBarber] Failed to link user_id to existing barber:", linkError.message);
        return json({ error: `Failed to link auth user to barber: ${linkError.message}` });
      }
    } else {
      console.log("[inviteBarber] Barber record already linked correctly, no update needed");
    }
  } else {
    console.log("[inviteBarber] Creating new barber record with user_id:", authUserId);
    const { data: newBarber, error: barberError } = await supabaseAdmin
      .from("barbers")
      .insert({
        name,
        email,
        phone: phone || null,
        permission_level: permission_level || "service_provider",
        is_active: true,
        online_bookable: true,
        user_id: authUserId,
      })
      .select("id")
      .single();

    if (barberError) {
      console.error("[inviteBarber] Failed to create barber record:", barberError.message);
      return json({ error: `Failed to create barber record: ${barberError.message}` });
    }

    barberId = newBarber.id;
    console.log("[inviteBarber] Barber record created:", barberId);
  }

  console.log("[inviteBarber] Done. barber_id:", barberId, "auth user_id:", authUserId);
  return json({ success: true, barber_id: barberId });
});
