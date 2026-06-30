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

const BRAND = `<tr><td align="center" style="padding-bottom:28px">
  <span style="color:#8B9A7E;font-size:18px;font-weight:bold;letter-spacing:2px">STAND TALL BOOKING</span>
</td></tr>`;
const FOOTER = `<tr><td style="padding:20px 0 0;text-align:center">
  <p style="margin:0;color:#888;font-size:11px">© 2026 Stand Tall Booking</p>
</td></tr>`;

function approvalEmail(name: string, promoCode: string, portalLink: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0D0D0D;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D0D;padding:40px 16px">
  <tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
    ${BRAND}
    <tr><td style="background:#1A1A1A;border-radius:12px;padding:32px;border:1px solid #2a2a2a">
      <h2 style="margin:0 0 16px;color:#F2F0EB;font-size:22px">You're approved, ${name.split(" ")[0]}!</h2>
      <p style="margin:0 0 24px;color:#F2F0EB;font-size:15px;line-height:1.6">
        Your affiliate application has been approved. Here's your personal promo code to share:
      </p>
      <div style="background:#0D0D0D;border:2px solid #8B9A7E;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px">
        <p style="margin:0 0 4px;color:#8B9A7E;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;font-weight:600">Your Promo Code</p>
        <p style="margin:0;color:#F2F0EB;font-size:28px;font-weight:bold;letter-spacing:0.1em;font-family:monospace">${promoCode}</p>
      </div>
      <p style="margin:0 0 16px;color:#888;font-size:13px;line-height:1.6">
        When a new shop signs up using your code, you'll earn commission on their subscription revenue for 3 months. The rate is a sliding scale — the more shops you refer, the higher your percentage (up to 50%).
      </p>
      <p style="margin:0 0 28px;color:#888;font-size:13px;line-height:1.6">
        Set up your affiliate portal below to track referrals, see your commission history, and monitor your earnings in real time.
      </p>
      <table cellpadding="0" cellspacing="0">
        <tr><td style="border-radius:6px;background:#8B9A7E">
          <a href="${portalLink}" style="display:inline-block;padding:14px 28px;color:#0D0D0D;font-size:15px;font-weight:bold;text-decoration:none">Set up my portal →</a>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;color:#555;font-size:12px">This setup link expires in 24 hours. If it has expired, reply to this email and we'll send a new one.</p>
    </td></tr>
    ${FOOTER}
  </table></td></tr>
</table></body></html>`;
}

function rejectionEmail(name: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0D0D0D;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D0D;padding:40px 16px">
  <tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
    ${BRAND}
    <tr><td style="background:#1A1A1A;border-radius:12px;padding:32px;border:1px solid #2a2a2a">
      <h2 style="margin:0 0 16px;color:#F2F0EB;font-size:22px">Application update</h2>
      <p style="margin:0 0 16px;color:#F2F0EB;font-size:15px;line-height:1.6">
        Hi ${name.split(" ")[0]},
      </p>
      <p style="margin:0;color:#888;font-size:14px;line-height:1.7">
        Thank you for applying to the Stand Tall Booking affiliate program. After review, we're not able to move forward with your application at this time. We appreciate your interest and wish you the best.
      </p>
    </td></tr>
    ${FOOTER}
  </table></td></tr>
</table></body></html>`;
}

async function generateUniquePromoCode(supabase: ReturnType<typeof createClient>, name: string): Promise<string | null> {
  const base = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 7);
  for (let attempt = 0; attempt < 8; attempt++) {
    const suffix = String(Math.floor(100 + Math.random() * 900));
    const code = base + suffix;
    const { data } = await supabase.from("affiliates").select("id").eq("promo_code", code).maybeSingle();
    if (!data) return code;
  }
  return null; // extremely unlikely
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Verify caller is authenticated
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const jwt = authHeader.replace(/^bearer\s+/i, "");
  const { data: { user: caller }, error: callerErr } = await supabaseAdmin.auth.getUser(jwt);
  if (callerErr || !caller) return json({ error: "Unauthorized" }, 401);

  // Verify caller is admin/owner/superadmin
  const { data: callerBarber } = await supabaseAdmin
    .from("barbers")
    .select("permission_level")
    .eq("user_id", caller.id)
    .maybeSingle();
  if (!callerBarber || !["owner", "manager", "superadmin"].includes(callerBarber.permission_level ?? "")) {
    return json({ error: "Forbidden" }, 403);
  }

  let body: { affiliate_id?: string; action?: "approve" | "reject" };
  try { body = await req.json(); }
  catch { return json({ error: "Invalid request body" }, 400); }

  const { affiliate_id, action } = body;
  if (!affiliate_id || !action || !["approve", "reject"].includes(action)) {
    return json({ error: "affiliate_id and action (approve|reject) are required" }, 400);
  }

  // Fetch the affiliate
  const { data: affiliate, error: fetchErr } = await supabaseAdmin
    .from("affiliates")
    .select("id, name, email, application_status, promo_code")
    .eq("id", affiliate_id)
    .single();
  if (fetchErr || !affiliate) return json({ error: "Affiliate not found" }, 404);

  if (affiliate.application_status !== "pending") {
    return json({ error: `Application is already '${affiliate.application_status}' — cannot ${action}.` }, 409);
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");

  if (action === "reject") {
    const { error: updateErr } = await supabaseAdmin
      .from("affiliates")
      .update({
        application_status: "rejected",
        reviewed_at:        new Date().toISOString(),
        reviewed_by:        caller.id,
      })
      .eq("id", affiliate_id);
    if (updateErr) return json({ error: "Failed to update affiliate status." }, 500);

    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Stand Tall Booking <bookings@standtallbooking.com>",
          to: [affiliate.email],
          subject: "Your Stand Tall Booking affiliate application",
          html: rejectionEmail(affiliate.name),
        }),
      });
    }
    return json({ success: true, action: "rejected" });
  }

  // ── APPROVE ──────────────────────────────────────────────────────────────────
  const promoCode = await generateUniquePromoCode(supabaseAdmin, affiliate.name);
  if (!promoCode) return json({ error: "Could not generate a unique promo code. Please try again." }, 500);

  // Create Supabase Auth user (or look up existing) and generate invite link
  let authUserId: string;
  let portalLink: string;

  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email: affiliate.email,
    options: { redirectTo: "https://www.standtallbooking.com/affiliate/dashboard" },
  });

  if (linkErr) {
    // User may already exist — look them up
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const existing = listData?.users?.find((u) => u.email === affiliate.email);
    if (!existing) {
      console.error("[approve-affiliate] generateLink failed:", linkErr.message);
      return json({ error: `Failed to create portal account: ${linkErr.message}` }, 500);
    }
    authUserId = existing.id;
    // Generate a magic link for existing user
    const { data: ml, error: mlErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: affiliate.email,
      options: { redirectTo: "https://www.standtallbooking.com/affiliate/dashboard" },
    });
    if (mlErr || !ml?.properties?.action_link) {
      return json({ error: "Failed to generate portal login link." }, 500);
    }
    portalLink = ml.properties.action_link;
  } else {
    authUserId   = linkData!.user.id;
    portalLink   = linkData!.properties!.action_link;
  }

  // Update affiliate row
  const { error: updateErr } = await supabaseAdmin
    .from("affiliates")
    .update({
      application_status: "approved",
      promo_code:         promoCode,
      auth_user_id:       authUserId,
      reviewed_at:        new Date().toISOString(),
      reviewed_by:        caller.id,
    })
    .eq("id", affiliate_id);
  if (updateErr) {
    console.error("[approve-affiliate] update error:", updateErr);
    return json({ error: "Failed to update affiliate record." }, 500);
  }

  // Email the affiliate
  if (resendKey) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Stand Tall Booking <bookings@standtallbooking.com>",
        to: [affiliate.email],
        subject: "You're approved — your Stand Tall Booking promo code",
        html: approvalEmail(affiliate.name, promoCode, portalLink),
      }),
    });
    if (!r.ok) console.error("[approve-affiliate] Resend error:", await r.text());
    else console.log("[approve-affiliate] Approval email sent to:", affiliate.email, "| code:", promoCode);
  } else {
    console.warn("[approve-affiliate] RESEND_API_KEY not set — skipping affiliate email");
  }

  return json({ success: true, action: "approved", promo_code: promoCode });
});
