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
  // Strip leading country code 1 if 11 digits
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

  let body: { phone?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request body" }, 400); }

  const phone = normalizePhone(body.phone || "");
  if (phone.length < 10) return json({ error: "Invalid phone number" }, 400);

  const code      = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Remove any existing unused OTPs for this number
  await db.from("otp_codes").delete().eq("phone", phone).eq("used", false);

  const { error: insertErr } = await db
    .from("otp_codes")
    .insert({ phone, code, expires_at: expiresAt, used: false });

  if (insertErr) {
    console.error("[sendOTP] insert error:", insertErr);
    return json({ error: "Failed to generate code" }, 500);
  }

  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken  = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromPhone  = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromPhone) {
    console.error("[sendOTP] Twilio credentials not set");
    return json({ error: "SMS service not configured" }, 500);
  }

  const toPhone = `+1${phone}`;

  const twilioRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To:   toPhone,
        From: fromPhone,
        Body: `Your Stand Tall Booking verification code is ${code}. Valid for 10 minutes.`,
      }).toString(),
    }
  );

  if (!twilioRes.ok) {
    const errBody = await twilioRes.json().catch(() => ({}));
    console.error("[sendOTP] Twilio error:", errBody);
    return json({ error: "Failed to send SMS" }, 500);
  }

  console.log("[sendOTP] OTP sent to", toPhone);
  return json({ success: true });
});
