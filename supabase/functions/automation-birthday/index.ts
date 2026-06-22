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

  if (!ms.birthday_enabled) {
    return json({ skipped: "birthday_enabled is false", sent: 0 });
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

  const today     = new Date();
  const todayMonth = today.getMonth() + 1; // 1-12
  const todayDay   = today.getDate();
  const thisYear   = today.getFullYear();

  // ── Find clients with a birthday today not yet sent this year ───────────────
  // Supabase JS client can't do EXTRACT in a filter, so fetch birthdate-having clients
  // and filter in-memory. Birthday list is typically small.
  const { data: candidates } = await db
    .from("clients")
    .select("id, name, email, birthdate, last_birthday_sent_year")
    .eq("shop_id", shopId)
    .eq("marketing_email_opt_out", false)
    .not("email", "is", null)
    .neq("email", "")
    .not("birthdate", "is", null);

  if (!candidates?.length) return json({ sent: 0, message: "No clients with birthdate" });

  const eligible = (candidates as (Client & { birthdate: string; last_birthday_sent_year: number | null })[])
    .filter(c => {
      const [, monthStr, dayStr] = c.birthdate.split("-");
      const month = Number(monthStr);
      const day   = Number(dayStr);
      const alreadySentThisYear = c.last_birthday_sent_year === thisYear;
      return month === todayMonth && day === todayDay && !alreadySentThisYear;
    });

  if (!eligible.length) {
    return json({ sent: 0, message: `No birthdays today (${todayMonth}/${todayDay}) that haven't been sent this year` });
  }

  // ── Fetch birthday template ─────────────────────────────────────────────────
  let subject  = `Happy Birthday from ${shopName}! 🎂`;
  let bodyHtml = `<p>Hey {{client_name}},</p>

<p>Happy Birthday from all of us at ${shopName}! 🎉</p>

<p>We hope your special day is amazing. There's no better way to celebrate than with a fresh cut — you deserve it.</p>

<p>Come see us and let's make your birthday look as good as you feel:</p>

<p>{{booking_link}}</p>

<p>Many happy returns,<br>The ${shopName} Team</p>`;

  if (ms.birthday_template_id) {
    const { data: tmpl } = await db
      .from("marketing_campaigns")
      .select("subject, body_html")
      .eq("id", ms.birthday_template_id)
      .single();
    if (tmpl?.body_html) {
      subject  = tmpl.subject ?? subject;
      bodyHtml = tmpl.body_html;
    }
  }

  // ── Create campaign record ──────────────────────────────────────────────────
  const now = new Date().toISOString();
  const { data: campaign } = await db
    .from("marketing_campaigns")
    .insert({
      shop_id:      shopId,
      name:         `Birthday — ${todayMonth}/${todayDay}/${thisYear}`,
      type:         "automation",
      channel:      "email",
      status:       "draft",
      subject,
      body_html:    bodyHtml,
      segment_type: "birthday",
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
      console.error(`[automation-birthday] Resend error for ${client.email}:`, await res.json().catch(() => ({})));
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

  // ── Update last_birthday_sent_year gate column ──────────────────────────────
  const sentClientIds = eligible
    .filter(c => sendIdByClient[c.id] && successIds.includes(sendIdByClient[c.id]))
    .map(c => c.id);

  if (sentClientIds.length) {
    await db.from("clients").update({ last_birthday_sent_year: thisYear }).in("id", sentClientIds);
  }

  console.log(`[automation-birthday] sent=${successIds.length} failed=${failedIds.length}`);
  return json({ success: true, sent: successIds.length, failed: failedIds.length });
});
