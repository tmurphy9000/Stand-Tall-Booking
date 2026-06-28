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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey   = Deno.env.get("RESEND_API_KEY");

  if (!supabaseUrl || !serviceKey || !resendKey) {
    return json({ error: "Server configuration error" }, 500);
  }

  // ── Auth check ──────────────────────────────────────────────────────────────
  // Only authenticated barbers can trigger a campaign send. We also verify
  // that the campaign's shop_id matches the caller's shop so a barber from
  // shop A cannot send shop B's campaigns.
  const authHeader = req.headers.get("authorization") || "";
  const jwt = authHeader.replace(/^bearer\s+/i, "");
  if (!jwt) return json({ error: "Unauthorized" }, 401);

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user } } = await db.auth.getUser(jwt);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const { data: callerBarber } = await db
    .from("barbers")
    .select("shop_id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Caller must have a barber record; shop_id = null means superadmin (all shops)
  if (!callerBarber) return json({ error: "Forbidden" }, 403);

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

  // Verify the caller owns this campaign's shop (superadmin shop_id = null bypasses)
  if (callerBarber.shop_id !== null && campaign.shop_id !== callerBarber.shop_id) {
    return json({ error: "Forbidden" }, 403);
  }

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
