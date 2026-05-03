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

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Server configuration error" }, 500);
  }
  const db = createClient(supabaseUrl, serviceKey);

  let body: { phone?: string; code?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request body" }, 400); }

  const phone = normalizePhone(body.phone || "");
  const code  = (body.code || "").trim();

  if (phone.length < 10) return json({ error: "Invalid phone number" }, 400);
  if (!code)             return json({ error: "Code is required" }, 400);

  // Find a valid, unused, non-expired OTP
  const { data: otp, error: otpErr } = await db
    .from("otp_codes")
    .select("id")
    .eq("phone", phone)
    .eq("code", code)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (otpErr) {
    console.error("[verifyOTP] query error:", otpErr);
    return json({ error: "Verification failed" }, 500);
  }
  if (!otp) return json({ error: "Invalid or expired code" }, 400);

  // Consume the OTP
  await db.from("otp_codes").update({ used: true }).eq("id", otp.id);

  // Look up client — try both bare 10-digit and +1 prefix stored formats
  const { data: clients } = await db
    .from("clients")
    .select("*")
    .or(`phone.eq.${phone},phone.eq.+1${phone},phone.eq.1${phone}`);

  const client = clients?.[0] ?? null;

  // Fetch upcoming bookings for this client
  let bookings: unknown[] = [];
  if (client) {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await db
      .from("bookings")
      .select("id, date, start_time, end_time, barber_name, service_name, status, duration")
      .eq("client_id", client.id)
      .gte("date", today)
      .neq("status", "cancelled")
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });
    bookings = data ?? [];
  }

  console.log("[verifyOTP] verified phone:", phone, "| client found:", !!client, "| upcoming bookings:", bookings.length);
  return json({ success: true, client, bookings });
});
