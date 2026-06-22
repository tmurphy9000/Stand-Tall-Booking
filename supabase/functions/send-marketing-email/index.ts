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

// Wrap every absolute URL in the HTML through the click-tracking endpoint.
// Only http/https hrefs are wrapped — mailto:, tel:, # are left untouched.
function wrapLinks(html: string, sendId: string, trackBase: string): string {
  return html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (_, url) =>
      `href="${trackBase}/click?sid=${sendId}&url=${encodeURIComponent(url)}"`,
  );
}

function buildMarketingHtml(args: {
  client_name: string;
  body_html: string;
  shop_name: string;
  booking_url: string;
  promo_code?: string;
  send_id: string;
  track_base: string;
}): string {
  const { client_name, body_html, shop_name, booking_url, promo_code, send_id, track_base } = args;

  const content = (body_html || "")
    .replace(/\{\{client_name\}\}/g, client_name)
    .replace(
      /\{\{booking_link\}\}/g,
      `<a href="${booking_url}" style="display:inline-block;margin:8px 0;padding:12px 24px;background:#0A0A0A;color:#ffffff;text-decoration:none;border-radius:6px;font-family:Helvetica,sans-serif;font-size:14px;font-weight:600">Book Your Appointment →</a>`,
    )
    .replace(
      /\{\{promo_code\}\}/g,
      promo_code
        ? `<span style="display:inline-block;padding:8px 16px;background:#F5F5F0;border:2px dashed #8B9A7E;border-radius:4px;font-family:monospace;font-size:18px;font-weight:700;letter-spacing:3px;color:#0A0A0A">${promo_code}</span>`
        : '<span style="color:#999">[promo code]</span>',
    );

  const pixel = `<img src="${track_base}/open?sid=${send_id}" width="1" height="1" style="width:1px!important;height:1px!important;border:0;display:block" alt="">`;

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${shop_name}</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F0;font-family:Georgia,serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:#0A0A0A;padding:28px 40px;text-align:center">
            <p style="margin:0;color:#8B9A7E;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px">${shop_name}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;color:#333333;font-size:15px;line-height:1.8">
            ${pixel}
            ${content}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #F0F0F0;text-align:center">
            <p style="margin:0;font-size:11px;color:#999999;font-family:Helvetica,sans-serif">
              You're receiving this email as a valued client of ${shop_name}.<br>
              To unsubscribe, reply to this email with the word <strong>unsubscribe</strong>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Wrap all absolute links through the click tracker
  html = wrapLinks(html, send_id, track_base);

  return html;
}

type Client  = { id: string; name: string | null; email: string };
type Booking = { client_id: string; date: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey   = Deno.env.get("RESEND_API_KEY");

  if (!supabaseUrl || !serviceKey || !resendKey) {
    return json({ error: "Server configuration error" }, 500);
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: { campaign_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request body" }, 400); }

  const { campaign_id } = body;
  if (!campaign_id) return json({ error: "campaign_id is required" }, 400);

  // ── Fetch campaign ──────────────────────────────────────────────────────────
  const { data: campaign, error: campErr } = await db
    .from("marketing_campaigns")
    .select("*")
    .eq("id", campaign_id)
    .single();

  if (campErr || !campaign) return json({ error: "Campaign not found" }, 404);
  if (campaign.status === "sent") return json({ error: "Campaign already sent" }, 400);
  if (!campaign.subject || !campaign.body_html) {
    return json({ error: "Campaign is missing subject or body" }, 400);
  }

  // ── Shop info ───────────────────────────────────────────────────────────────
  const { data: shop } = await db
    .from("shops")
    .select("name, url_slug")
    .eq("id", campaign.shop_id)
    .single();

  const shopName   = shop?.name ?? "Stand Tall Barbershop";
  const urlSlug    = shop?.url_slug ?? "";
  const siteBase   = Deno.env.get("PUBLIC_SITE_URL") ?? "https://standtallbooking.com";
  const bookingUrl = urlSlug ? `${siteBase}/book/${urlSlug}` : `${siteBase}/book`;
  const trackBase  = `${supabaseUrl}/functions/v1/marketing-track`;

  // ── Promo code ──────────────────────────────────────────────────────────────
  let promoCodeValue: string | undefined;
  const promoCodeId = campaign.segment_params?.promo_code_id;
  if (promoCodeId) {
    const { data: pc } = await db
      .from("promo_codes")
      .select("code")
      .eq("id", promoCodeId)
      .single();
    promoCodeValue = pc?.code;
  }

  // ── Fetch eligible clients ──────────────────────────────────────────────────
  const { data: allClients } = await db
    .from("clients")
    .select("id, name, email")
    .eq("shop_id", campaign.shop_id)
    .eq("marketing_email_opt_out", false)
    .not("email", "is", null)
    .neq("email", "");

  if (!allClients || allClients.length === 0) {
    return json({ error: "No eligible clients found", sent: 0 });
  }

  let eligibleClients: Client[] = allClients as Client[];

  if (campaign.segment_type === "win_back") {
    const days     = Number(campaign.segment_params?.days ?? 60);
    const cutoff   = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const clientIds = eligibleClients.map(c => c.id);
    const { data: lastBookings } = await db
      .from("bookings")
      .select("client_id, date")
      .in("client_id", clientIds)
      .neq("status", "cancelled")
      .order("date", { ascending: false });

    const lastVisit: Record<string, string> = {};
    for (const b of (lastBookings ?? []) as Booking[]) {
      if (!lastVisit[b.client_id]) lastVisit[b.client_id] = b.date;
    }
    eligibleClients = eligibleClients.filter(c => {
      const lv = lastVisit[c.id];
      return lv !== undefined && lv < cutoffStr;
    });

  } else if (campaign.segment_type === "no_visits") {
    const clientIds = eligibleClients.map(c => c.id);
    const { data: visitedData } = await db
      .from("bookings")
      .select("client_id")
      .in("client_id", clientIds)
      .neq("status", "cancelled");

    const visitedIds = new Set(
      ((visitedData ?? []) as { client_id: string }[]).map(b => b.client_id),
    );
    eligibleClients = eligibleClients.filter(c => !visitedIds.has(c.id));
  }

  if (eligibleClients.length === 0) {
    return json({ error: "No clients match the selected segment", sent: 0 });
  }

  // ── Pre-insert campaign_sends rows to obtain unique IDs for tracking ────────
  // Each recipient gets their own row upfront; the row's UUID is embedded in
  // their email's tracking pixel and link URLs before the email is built.
  const now = new Date().toISOString();
  const { data: insertedSends, error: insertErr } = await db
    .from("campaign_sends")
    .insert(
      eligibleClients.map(c => ({
        campaign_id,
        client_id: c.id,
        channel:   "email",
        status:    "pending",
        sent_at:   now,
      })),
    )
    .select("id, client_id");

  if (insertErr || !insertedSends) {
    console.error("[send-marketing-email] Failed to pre-insert sends:", insertErr);
    return json({ error: "Failed to initialise send tracking" }, 500);
  }

  const sendIdByClient: Record<string, string> = {};
  for (const row of insertedSends as { id: string; client_id: string }[]) {
    sendIdByClient[row.client_id] = row.id;
  }

  // ── Send emails ─────────────────────────────────────────────────────────────
  const successIds: string[] = [];
  const failedIds:  string[] = [];

  for (const client of eligibleClients) {
    const sendId = sendIdByClient[client.id];
    if (!sendId) continue;

    const html = buildMarketingHtml({
      client_name: client.name ?? "Valued Client",
      body_html:   campaign.body_html,
      shop_name:   shopName,
      booking_url: bookingUrl,
      promo_code:  promoCodeValue,
      send_id:     sendId,
      track_base:  trackBase,
    });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        from:    `${shopName} <no-reply@mail.standtallbooking.com>`,
        to:      [client.email],
        subject: campaign.subject,
        html,
      }),
    });

    if (res.ok) {
      successIds.push(sendId);
    } else {
      failedIds.push(sendId);
      const errBody = await res.json().catch(() => ({}));
      console.error(`[send-marketing-email] Resend error for ${client.email}:`, errBody);
    }
  }

  // ── Batch update send statuses ──────────────────────────────────────────────
  const updates: Promise<unknown>[] = [];
  if (successIds.length > 0) {
    updates.push(
      db.from("campaign_sends").update({ status: "sent"   }).in("id", successIds),
    );
  }
  if (failedIds.length > 0) {
    updates.push(
      db.from("campaign_sends").update({ status: "failed" }).in("id", failedIds),
    );
  }
  await Promise.all(updates);

  // ── Mark campaign as sent ───────────────────────────────────────────────────
  await db.from("marketing_campaigns").update({
    status:          "sent",
    sent_at:         now,
    recipient_count: successIds.length,
  }).eq("id", campaign_id);

  console.log(
    `[send-marketing-email] campaign ${campaign_id}: ${successIds.length} sent, ${failedIds.length} failed`,
  );
  return json({ success: true, sent: successIds.length, failed: failedIds.length });
});
