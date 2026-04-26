import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the calling user exists and is authenticated
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { name, email, phone, permission_level, temp_password } = await req.json();

    if (!name || !email || !temp_password) {
      return new Response(JSON.stringify({ error: "name, email, and temp_password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create the barber record
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

    if (barberError) throw new Error(barberError.message);

    // 2. Create the Supabase Auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temp_password,
      email_confirm: true,
    });

    if (authError) {
      // Rollback: delete the barber record we just created
      await supabaseAdmin.from("barbers").delete().eq("id", barber.id);
      throw new Error(authError.message);
    }

    // 3. Link the auth user ID to the barber record
    const { error: linkError } = await supabaseAdmin
      .from("barbers")
      .update({ user_id: authData.user.id })
      .eq("id", barber.id);

    if (linkError) throw new Error(linkError.message);

    return new Response(
      JSON.stringify({ success: true, barber_id: barber.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
