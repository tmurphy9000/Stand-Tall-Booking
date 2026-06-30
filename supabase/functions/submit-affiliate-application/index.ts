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

const ADMIN_EMAIL = "tmurphy9000@gmail.com";

const BRAND = `<tr><td align="center" style="padding-bottom:28px">
  <span style="color:#8B9A7E;font-size:18px;font-weight:bold;letter-spacing:2px">STAND TALL BOOKING</span>
</td></tr>`;
const FOOTER = `<tr><td style="padding:20px 0 0;text-align:center">
  <p style="margin:0;color:#888;font-size:11px">© 2026 Stand Tall Booking</p>
</td></tr>`;

function adminNotificationEmail(name: string, email: string, phone: string, social: string, whyJoin: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0D0D0D;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D0D;padding:40px 16px">
  <tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
    ${BRAND}
    <tr><td style="background:#1A1A1A;border-radius:12px;padding:32px;border:1px solid #2a2a2a">
      <h2 style="margin:0 0 20px;color:#F2F0EB;font-size:20px">New Affiliate Application</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="color:#F2F0EB;font-size:14px;line-height:1.8">
        <tr><td style="color:#888;padding-right:12px;white-space:nowrap">Name</td><td>${name}</td></tr>
        <tr><td style="color:#888;padding-right:12px;white-space:nowrap">Email</td><td>${email}</td></tr>
        <tr><td style="color:#888;padding-right:12px;white-space:nowrap">Phone</td><td>${phone || "—"}</td></tr>
        <tr><td style="color:#888;padding-right:12px;white-space:nowrap;vertical-align:top;padding-top:4px">Social / Audience</td><td style="padding-top:4px">${social || "—"}</td></tr>
        <tr><td colspan="2" style="padding-top:16px"><hr style="border:none;border-top:1px solid #2a2a2a;margin:0 0 16px" /></td></tr>
        <tr><td colspan="2" style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;padding-bottom:6px">Why they want to join</td></tr>
        <tr><td colspan="2">${whyJoin || "—"}</td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" style="margin-top:28px">
        <tr><td style="border-radius:6px;background:#8B9A7E">
          <a href="https://www.standtallbooking.com/admin" style="display:inline-block;padding:12px 24px;color:#0D0D0D;font-size:14px;font-weight:bold;text-decoration:none">Review in Admin Dashboard →</a>
        </td></tr>
      </table>
    </td></tr>
    ${FOOTER}
  </table></td></tr>
</table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let body: { name?: string; email?: string; phone?: string; social_media_links?: string; why_join?: string };
  try { body = await req.json(); }
  catch { return json({ error: "Invalid request body" }, 400); }

  const name  = (body.name  ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const phone = (body.phone ?? "").trim();
  const social = (body.social_media_links ?? "").trim();
  const whyJoin = (body.why_join ?? "").trim();

  if (!name || !email) return json({ error: "Name and email are required." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Invalid email address." }, 400);
  if (name.length > 120 || email.length > 200 || social.length > 1000 || whyJoin.length > 2000) {
    return json({ error: "One or more fields exceed the maximum length." }, 400);
  }

  // Rate-limit: one pending/approved application per email address
  const { data: existing } = await supabase
    .from("affiliates")
    .select("id, application_status")
    .eq("email", email)
    .in("application_status", ["pending", "approved"])
    .maybeSingle();

  if (existing) {
    const msg = existing.application_status === "approved"
      ? "This email is already associated with an approved affiliate account."
      : "An application from this email is already under review.";
    return json({ error: msg }, 409);
  }

  // Insert application
  const { error: insertErr } = await supabase.from("affiliates").insert({
    name,
    email,
    phone:              phone  || null,
    social_media_links: social || null,
    why_join:           whyJoin || null,
    application_status: "pending",
  });

  if (insertErr) {
    console.error("[submit-affiliate-application] insert error:", insertErr);
    return json({ error: "Failed to submit application. Please try again." }, 500);
  }

  // Email Tanner
  if (resendKey) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Stand Tall Booking <bookings@standtallbooking.com>",
        to: [ADMIN_EMAIL],
        subject: `New affiliate application — ${name}`,
        html: adminNotificationEmail(name, email, phone, social, whyJoin),
      }),
    });
    if (!r.ok) console.error("[submit-affiliate-application] Resend error:", await r.text());
    else console.log("[submit-affiliate-application] Admin notified for:", email);
  } else {
    console.warn("[submit-affiliate-application] RESEND_API_KEY not set — skipping admin email");
  }

  return json({ success: true });
});
