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
  console.log("[sendOTP] request received, method:", req.method);

  if (req.method === "OPTIONS") {
    console.log("[sendOTP] OPTIONS preflight, returning 204");
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ── env check ────────────────────────────────────────────────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const accountSid  = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken   = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromPhone   = Deno.env.get("TWILIO_PHONE_NUMBER");

  console.log("[sendOTP] env check — SUPABASE_URL:", !!supabaseUrl, "| SERVICE_ROLE_KEY:", !!serviceKey,
    "| TWILIO_ACCOUNT_SID:", !!accountSid, "| TWILIO_AUTH_TOKEN:", !!authToken, "| TWILIO_PHONE_NUMBER:", !!fromPhone);

  if (!supabaseUrl || !serviceKey) {
    console.error("[sendOTP] missing Supabase env vars");
    return json({ error: "Server configuration error" }, 500);
  }

  if (!accountSid || !authToken || !fromPhone) {
    console.error("[sendOTP] missing Twilio env vars");
    return json({ error: "SMS service not configured" }, 500);
  }

  // ── parse body ───────────────────────────────────────────────────────────────
  let body: { phone?: string };
  try {
    body = await req.json();
    console.log("[sendOTP] body parsed, raw phone:", body.phone);
  } catch (e) {
    console.error("[sendOTP] failed to parse request body:", e);
    return json({ error: "Invalid request body" }, 400);
  }

  const phone = normalizePhone(body.phone || "");
  console.log("[sendOTP] normalized phone:", phone, "length:", phone.length);

  if (phone.length < 10) {
    console.error("[sendOTP] phone too short:", phone);
    return json({ error: "Invalid phone number" }, 400);
  }

  // ── generate OTP ─────────────────────────────────────────────────────────────
  const code      = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  console.log("[sendOTP] generated code:", code, "| expires:", expiresAt);

  // ── database writes ───────────────────────────────────────────────────────────
  const db = createClient(supabaseUrl, serviceKey);

  console.log("[sendOTP] deleting old OTPs for phone:", phone);
  const { error: deleteErr } = await db
    .from("otp_codes")
    .delete()
    .eq("phone", phone)
    .eq("used", false);
  if (deleteErr) {
    console.error("[sendOTP] delete old OTPs error:", deleteErr);
    // non-fatal — continue
  } else {
    console.log("[sendOTP] old OTPs deleted (or none existed)");
  }

  console.log("[sendOTP] inserting new OTP into otp_codes");
  const { error: insertErr } = await db
    .from("otp_codes")
    .insert({ phone, code, expires_at: expiresAt, used: false });

  if (insertErr) {
    console.error("[sendOTP] insert error:", JSON.stringify(insertErr));
    return json({ error: "Failed to generate code" }, 500);
  }
  console.log("[sendOTP] OTP inserted successfully");

  // ── Twilio SMS ────────────────────────────────────────────────────────────────
  const toPhone = `+1${phone}`;
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  console.log("[sendOTP] calling Twilio — from:", fromPhone, "| to:", toPhone, "| url:", twilioUrl);

  let twilioRes: Response;
  try {
    twilioRes = await fetch(twilioUrl, {
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
    });
  } catch (fetchErr) {
    console.error("[sendOTP] fetch to Twilio threw:", fetchErr);
    return json({ error: "Failed to reach SMS service" }, 500);
  }

  console.log("[sendOTP] Twilio response status:", twilioRes.status);

  const twilioBody = await twilioRes.text();
  console.log("[sendOTP] Twilio response body:", twilioBody);

  if (!twilioRes.ok) {
    console.error("[sendOTP] Twilio returned non-2xx:", twilioRes.status, twilioBody);
    return json({ error: "Failed to send SMS" }, 500);
  }

  console.log("[sendOTP] SMS sent successfully to", toPhone);
  return json({ success: true });
});
