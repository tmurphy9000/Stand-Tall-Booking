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

type Client = { id: string; name: string | null; email: string };

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

  if (!ms.review_request_enabled) {
    return json({ skipped: "review_request_enabled is false", sent: 0 });
  }

  const afterVisits = Number(ms.review_request_after_visits ?? 3);
  const googleEnabled = !!(ms.google_review_enabled && ms.google_review_url);
  const yelpEnabled   = !!(ms.yelp_review_enabled   && ms.yelp_review_url);

  if (!googleEnabled && !yelpEnabled) {
    return json({ skipped: "no review platforms configured", sent: 0 });
  }

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

  // ── Candidates: opted-in clients who have never received a review request ──
  const { data: candidates } = await db
    .from("clients")
    .select("id, name, email")
    .eq("shop_id", shopId)
    .eq("marketing_email_opt_out", false)
    .is("review_request_sent_at", null)
    .not("email", "is", null)
    .neq("email", "");

  if (!candidates?.length) return json({ sent: 0, message: "No candidates" });

  // ── Filter to clients with >= N completed bookings ──────────────────────────
  const { data: completedBookings } = await db
    .from("bookings")
    .select("client_id")
    .in("client_id", (candidates as Client[]).map(c => c.id))
    .eq("status", "completed");

  const completedCount: Record<string, number> = {};
  for (const b of (completedBookings ?? []) as { client_id: string }[]) {
    completedCount[b.client_id] = (completedCount[b.client_id] ?? 0) + 1;
  }

  const eligible = (candidates as Client[]).filter(
    c => (completedCount[c.id] ?? 0) >= afterVisits,
  );

  if (!eligible.length) return json({ sent: 0, message: "No clients have reached the visit threshold" });

  // ── Mark BEFORE sending to prevent duplicate sends from race conditions ─────
  await db
    .from("clients")
    .update({ review_request_sent_at: new Date().toISOString() })
    .in("id", eligible.map(c => c.id));

  // ── Build email body ────────────────────────────────────────────────────────
  const linkLines: string[] = [];
  if (googleEnabled) {
    linkLines.push(`⭐ <a href="${ms.google_review_url}" style="color:#8B9A7E;font-weight:600">Leave us a Google review</a>`);
  }
  if (yelpEnabled) {
    linkLines.push(`⭐ <a href="${ms.yelp_review_url}" style="color:#8B9A7E;font-weight:600">Leave us a Yelp review</a>`);
  }

  const bodyHtml = `<p>Hey {{client_name}},</p>

<p>Thank you for being a valued client of ${shopName}! We truly appreciate your loyalty and support.</p>

<p>If you have a moment, leaving us a review would mean the world to us — it helps others discover Stand Tall and only takes 30 seconds:</p>

<p>${linkLines.join("<br>")}</p>

<p>Thank you so much for your support!</p>

<p>With appreciation,<br>The ${shopName} Team</p>`;

  const subject = `Enjoying Stand Tall? We'd love a review!`;

  // ── Create campaign record for History tab visibility ───────────────────────
  const now = new Date().toISOString();
  const { data: campaign } = await db
    .from("marketing_campaigns")
    .insert({
      shop_id:      shopId,
      name:         `Review Request — ${now.split("T")[0]}`,
      type:         "automation",
      channel:      "email",
      status:       "draft",
      subject,
      body_html:    bodyHtml,
      segment_type: "all",
    })
    .select("id")
    .single();

  if (!campaign) return json({ error: "Failed to create campaign record" }, 500);

  // ── Pre-insert campaign_sends to get unique IDs for per-recipient tracking ──
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
      console.error(`[automation-review-request] Resend error for ${client.email}:`, await res.json().catch(() => ({})));
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

  console.log(`[automation-review-request] sent=${successIds.length} failed=${failedIds.length}`);
  return json({ success: true, sent: successIds.length, failed: failedIds.length });
});
