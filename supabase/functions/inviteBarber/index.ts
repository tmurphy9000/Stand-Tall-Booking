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
  console.log("[inviteBarber] Creating barber:", { name, email, phone, permission_level });

  if (!name || !email || !temp_password) {
    console.error("[inviteBarber] Missing required fields:", { name: !!name, email: !!email, temp_password: !!temp_password });
    return json({ error: "name, email, and temp_password are required" });
  }

  // Step 1: Create the barber record
  const { data: barber, error: barberError } = await supabaseAdmin
    .from("barbers")
    .insert({
      name,
      email,
      phone: phone || null,
      permission_level: permission_level || "service_provider",
      is_active: true,
      online_bookable: true,
    })
    .select()
    .single();

  if (barberError) {
    console.error("[inviteBarber] Failed to insert barber record:", barberError);
    return json({ error: `Failed to create barber record: ${barberError.message}` });
  }
  console.log("[inviteBarber] Barber record created:", barber.id);

  // Step 2: Create the Supabase Auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: temp_password,
    email_confirm: true,
  });

  if (authError) {
    console.error("[inviteBarber] Failed to create auth user:", authError);
    // Rollback: delete the barber record we just created
    const { error: rollbackError } = await supabaseAdmin.from("barbers").delete().eq("id", barber.id);
    if (rollbackError) {
      console.error("[inviteBarber] Rollback failed:", rollbackError);
    } else {
      console.log("[inviteBarber] Rolled back barber record:", barber.id);
    }
    return json({ error: `Failed to create auth user: ${authError.message}` });
  }
  console.log("[inviteBarber] Auth user created:", authData.user.id);

  // Step 3: Link the auth user ID to the barber record
  const { error: linkError } = await supabaseAdmin
    .from("barbers")
    .update({ user_id: authData.user.id })
    .eq("id", barber.id);

  if (linkError) {
    console.error("[inviteBarber] Failed to link user_id to barber:", linkError);
    return json({ error: `Failed to link auth user to barber: ${linkError.message}` });
  }
  console.log("[inviteBarber] Successfully linked auth user to barber");

  return json({ success: true, barber_id: barber.id });
});
