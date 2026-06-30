import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendSms, smsFormatTime } from "../_shared/twilio.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Server configuration error" }, 500);

  const db = createClient(supabaseUrl, serviceKey);

  // ── Time window: 22 to 26 hours from now ─────────────────────────────────
  // Each booking falls into exactly one hourly run (4-hour window / 1-hour cadence).
  // Appointments are stored as date "YYYY-MM-DD" + start_time "HH:MM" in local
  // shop time (no explicit tz). We treat them as UTC, which is consistent with
  // how booking confirmation emails format times. If the shop is in a different
  // timezone, the reminder may land an hour or two off from exactly 24h, but
  // it will always be in the 22–26h range.
  const now         = Date.now();
  const windowStart = now + 22 * 3_600_000;
  const windowEnd   = now + 26 * 3_600_000;

  // ── Fetch scheduled bookings with no reminder sent yet ────────────────────
  const { data: bookings, error: fetchErr } = await db
    .from("bookings")
    .select("id, barber_name, date, start_time, shop_id, client_id, client_phone")
    .eq("status", "scheduled")
    .is("reminder_sms_sent_at", null)
    .not("client_id", "is", null);

  if (fetchErr) {
    console.error("[send-booking-reminders] fetch error:", fetchErr);
    return json({ error: fetchErr.message }, 500);
  }

  const all = bookings ?? [];

  // ── Filter to the 22–26h window ───────────────────────────────────────────
  const inWindow = all.filter((b) => {
    if (!b.date || !b.start_time) return false;
    const [y, m, d]  = b.date.split("-").map(Number);
    const [h, min]   = b.start_time.split(":").map(Number);
    const apptMs     = Date.UTC(y, m - 1, d, h, min);
    return apptMs >= windowStart && apptMs < windowEnd;
  });

  console.log(`[send-booking-reminders] ${inWindow.length} bookings in window (of ${all.length} total unreminded)`);

  if (inWindow.length === 0) return json({ processed: 0, sent: 0 });

  // ── Batch-load client opt-in status ──────────────────────────────────────
  const clientIds = [...new Set(inWindow.map((b) => b.client_id).filter(Boolean))];
  const { data: clients } = await db
    .from("clients")
    .select("id, phone, sms_opt_in")
    .in("id", clientIds);

  const clientMap = new Map<string, { phone: string | null; sms_opt_in: boolean }>();
  for (const c of clients ?? []) {
    clientMap.set(c.id, { phone: c.phone, sms_opt_in: !!c.sms_opt_in });
  }

  // ── Batch-load shop names ─────────────────────────────────────────────────
  const shopIds = [...new Set(inWindow.map((b) => b.shop_id).filter(Boolean))];
  const { data: shopSettings } = await db
    .from("shop_settings")
    .select("shop_id, shop_name")
    .in("shop_id", shopIds);

  const shopNameMap = new Map<string, string>();
  for (const s of shopSettings ?? []) {
    shopNameMap.set(s.shop_id, s.shop_name ?? "your shop");
  }

  // ── Send reminders ────────────────────────────────────────────────────────
  let sent = 0;
  const now_iso = new Date().toISOString();

  for (const booking of inWindow) {
    const client   = clientMap.get(booking.client_id);
    const phone    = client?.phone ?? booking.client_phone ?? null;
    const optedIn  = !!client?.sms_opt_in;
    const shopName = shopNameMap.get(booking.shop_id) ?? "your shop";

    // Always mark as processed (even if no opt-in) to avoid re-querying next hour.
    await db
      .from("bookings")
      .update({ reminder_sms_sent_at: now_iso })
      .eq("id", booking.id);

    if (!phone || !optedIn) {
      console.log(`[send-booking-reminders] skipping booking ${booking.id} — no phone or not opted in`);
      continue;
    }

    const msg =
      `Reminder: your appointment at ${shopName} with ${booking.barber_name} ` +
      `is tomorrow at ${smsFormatTime(booking.start_time)}. Reply STOP to opt out.`;

    const { ok, error: smsErr } = await sendSms(phone, msg);
    if (ok) {
      sent++;
      console.log(`[send-booking-reminders] reminder sent for booking ${booking.id}`);
    } else {
      console.warn(`[send-booking-reminders] SMS failed for booking ${booking.id}:`, smsErr);
    }
  }

  return json({ processed: inWindow.length, sent });
});
