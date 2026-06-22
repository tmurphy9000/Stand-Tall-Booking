import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildMarketingHtml } from "../_shared/marketing-html.ts";

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

type Client  = { id: string; name: string | null; email: string };
type Booking = { client_id: string; date: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendKey   = Deno.env.get("RESEND_API_KEY")!;

  if (!supabaseUrl || !serviceKey || !resendKey) {
    return json({ error: "Server configuration error" }, 500);
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Load settings ───────────────────────────────────────────────────────────
  const { data: settingsRow } = await db
    .from("shop_settings")
    .select("marketing_settings")
    .limit(1)
    .single();

  const ms = settingsRow?.marketing_settings ?? {};

  if (!ms.winback_enabled) {
    return json({ skipped: "winback_enabled is false", sent: 0 });
  }

  const winbackDays = Number(ms.winback_days ?? 60);

  // ── Shop info ───────────────────────────────────────────────────────────────
  const { data: shop } = await db
    .from("shops")
    .select("id, name, url_slug")
    .limit(1)
    .single();

  const shopId     = shop?.id;
  const shopName   = shop?.name ?? "Stand Tall Barbershop";
  const siteBase   = Deno.env.get("PUBLIC_SITE_URL") ?? "https://standtallbooking.com";
  const bookingUrl = shop?.url_slug ? `${siteBase}/book/${shop.url_slug}` : `${siteBase}/book`;
  const trackBase  = `${supabaseUrl}/functions/v1/marketing-track`;

  // ── Target date: exactly N days ago ────────────────────────────────────────
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - winbackDays);
  const targetDateStr = targetDate.toISOString().split("T")[0];

  // ── Opted-in clients not winback'd within the last N days ──────────────────
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - winbackDays);
  const cutoffStr = cutoffDate.toISOString();

  const { data: candidates } = await db
    .from("clients")
    .select("id, name, email")
    .eq("shop_id", shopId)
    .eq("marketing_email_opt_out", false)
    .not("email", "is", null)
    .neq("email", "")
    .or(`last_winback_sent_at.is.null,last_winback_sent_at.lt.${cutoffStr}`);

  if (!candidates?.length) return json({ sent: 0, message: "No candidates" });

  // ── Find clients whose last completed booking was on the target date ────────
  const candidateIds = (candidates as Client[]).map(c => c.id);
  const { data: recentBookings } = await db
    .from("bookings")
    .select("client_id, date")
    .in("client_id", candidateIds)
    .eq("status", "completed")
    .order("date", { ascending: false });

  // Build last-completed-booking-date map
  const lastCompleted: Record<string, string> = {};
  for (const b of (recentBookings ?? []) as Booking[]) {
    if (!lastCompleted[b.client_id]) lastCompleted[b.client_id] = b.date;
  }

  const eligible = (candidates as Client[]).filter(
    c => lastCompleted[c.id] === targetDateStr,
  );

  if (!eligible.length) {
    return json({ sent: 0, message: `No clients last visited exactly ${winbackDays} days ago (${targetDateStr})` });
  }

  // ── Fetch win-back template ─────────────────────────────────────────────────
  let subject  = `We miss you — come back to ${shopName}!`;
  let bodyHtml = `<p>Hey {{client_name}},</p>

<p>It's been a while since your last visit at ${shopName}, and we miss you!</p>

<p>We'd love to have you back in the chair. Book whenever you're ready:</p>

<p>{{booking_link}}</p>

<p>See you soon,<br>The ${shopName} Team</p>`;

  if (ms.winback_template_id) {
    const { data: tmpl } = await db
      .from("marketing_campaigns")
      .select("subject, body_html")
      .eq("id", ms.winback_template_id)
      .single();
    if (tmpl?.body_html) {
      subject  = tmpl.subject ?? subject;
      bodyHtml = tmpl.body_html;
    }
  }

  // ── Fetch promo code if template uses one ───────────────────────────────────
  let promoCodeValue: string | undefined;
  if (ms.winback_promo_code_id) {
    const { data: pc } = await db
      .from("promo_codes")
      .select("code")
      .eq("id", ms.winback_promo_code_id)
      .single();
    promoCodeValue = pc?.code;
  }

  // ── Create campaign record ──────────────────────────────────────────────────
  const now = new Date().toISOString();
  const { data: campaign } = await db
    .from("marketing_campaigns")
    .insert({
      shop_id:      shopId,
      name:         `Win-Back — ${now.split("T")[0]}`,
      type:         "automation",
      channel:      "email",
      status:       "draft",
      subject,
      body_html:    bodyHtml,
      segment_type: "win_back",
      segment_params: { days: winbackDays },
    })
    .select("id")
    .single();

  if (!campaign) return json({ error: "Failed to create campaign record" }, 500);

  // ── Pre-insert campaign_sends ───────────────────────────────────────────────
  const { data: sendRows } = await db
    .from("campaign_sends")
    .insert(eligible.map(c => ({
      campaign_id: campaign.id,
      client_id:   c.id,
      channel:     "email",
      status:      "pending",
      sent_at:     now,
    })))
    .select("id, client_id");

  const sendIdByClient: Record<string, string> = {};
  for (const r of (sendRows ?? []) as { id: string; client_id: string }[]) {
    sendIdByClient[r.client_id] = r.id;
  }

  // ── Send emails ─────────────────────────────────────────────────────────────
  const successIds: string[] = [];
  const failedIds:  string[] = [];

  for (const client of eligible) {
    const sendId = sendIdByClient[client.id];
    if (!sendId) continue;

    const html = buildMarketingHtml({
      client_name: client.name ?? "Valued Client",
      body_html:   bodyHtml,
      shop_name:   shopName,
      booking_url: bookingUrl,
      promo_code:  promoCodeValue,
      send_id:     sendId,
      track_base:  trackBase,
    });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from:    `${shopName} <no-reply@mail.standtallbooking.com>`,
        to:      [client.email],
        subject,
        html,
      }),
    });

    if (res.ok) successIds.push(sendId);
    else {
      failedIds.push(sendId);
      console.error(`[automation-winback] Resend error for ${client.email}:`, await res.json().catch(() => ({})));
    }
  }

  // ── Batch update statuses ───────────────────────────────────────────────────
  const updates: Promise<unknown>[] = [];
  if (successIds.length) updates.push(db.from("campaign_sends").update({ status: "sent"   }).in("id", successIds));
  if (failedIds.length)  updates.push(db.from("campaign_sends").update({ status: "failed" }).in("id", failedIds));
  await Promise.all(updates);

  await db.from("marketing_campaigns").update({
    status:          "sent",
    sent_at:         now,
    recipient_count: successIds.length,
  }).eq("id", campaign.id);

  // ── Update last_winback_sent_at gate column ─────────────────────────────────
  const sentClientIds = eligible
    .filter(c => sendIdByClient[c.id] && successIds.includes(sendIdByClient[c.id]))
    .map(c => c.id);

  if (sentClientIds.length) {
    await db.from("clients").update({ last_winback_sent_at: now }).in("id", sentClientIds);
  }

  console.log(`[automation-winback] sent=${successIds.length} failed=${failedIds.length}`);
  return json({ success: true, sent: successIds.length, failed: failedIds.length });
});
