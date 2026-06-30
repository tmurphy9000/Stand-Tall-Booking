import Stripe from "https://esm.sh/stripe@22.2.1?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { sendSms, smsFormatDate, smsFormatTime } from "../_shared/twilio.ts";

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

// Sends a cancellation SMS to the client if they have sms_opt_in = true.
// Safe to call even when client info is missing — it just skips silently.
async function sendCancellationSms(
  supabase: ReturnType<typeof createClient>,
  booking: { client_id?: string | null; date: string; start_time: string; shop_id: string },
) {
  if (!booking.client_id) return;

  const [clientRes, shopRes, settingsRes] = await Promise.all([
    supabase
      .from("clients")
      .select("phone, sms_opt_in, name")
      .eq("id", booking.client_id)
      .maybeSingle(),
    supabase
      .from("shops")
      .select("url_slug")
      .eq("id", booking.shop_id)
      .maybeSingle(),
    supabase
      .from("shop_settings")
      .select("shop_name")
      .eq("shop_id", booking.shop_id)
      .maybeSingle(),
  ]);

  const client   = clientRes.data;
  const urlSlug  = shopRes.data?.url_slug ?? null;
  const shopName = settingsRes.data?.shop_name ?? "Stand Tall Booking";

  if (!client?.phone || !client.sms_opt_in) return;

  const bookLink = urlSlug
    ? `Book again at standtallbooking.com/book/${urlSlug}.`
    : "";

  const msg =
    `Your appointment at ${shopName} on ${smsFormatDate(booking.date)} at ` +
    `${smsFormatTime(booking.start_time)} has been cancelled. ` +
    `${bookLink} Reply STOP to opt out.`.trim();

  const { ok, error } = await sendSms(client.phone, msg);
  if (!ok) console.warn("[stripe-refund-deposit] cancellation SMS failed:", error);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const secretKey      = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl    = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!secretKey || !supabaseUrl || !serviceRoleKey) {
    return json({ error: "Server configuration error" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ── Caller identification ─────────────────────────────────────────────────
  // Two legitimate callers:
  //   Staff  — authenticated barber cancelling from the admin calendar.
  //            Identified by a valid user JWT. We verify the booking belongs
  //            to their shop server-side; shopId from the body is ignored.
  //   Guest  — OTP-verified client cancelling their own booking from the
  //            public booking page. No user JWT. Caller must supply clientId
  //            and we verify booking.client_id matches.
  const authHeader = req.headers.get("authorization") || "";
  const jwt = authHeader.replace(/^bearer\s+/i, "");

  let isStaff     = false;
  let staffShopId: string | null = null;

  if (jwt) {
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (user) {
      const { data: barber } = await supabase
        .from("barbers")
        .select("shop_id, is_active")
        .eq("user_id", user.id)
        .maybeSingle();
      // Superadmins may have shop_id = null — allow them to cancel any booking.
      if (barber && barber.is_active !== false) {
        isStaff     = true;
        staffShopId = barber.shop_id ?? null;
      }
    }
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  let body: { bookingId?: string; shopId?: string; clientId?: string; cancelReason?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const { bookingId, clientId, cancelReason } = body;

  if (!bookingId) return json({ error: "bookingId is required" }, 400);

  // Guest path requires clientId to prove ownership.
  if (!isStaff && !clientId) {
    return json({ error: "Unauthorized" }, 401);
  }

  // ── Booking lookup ────────────────────────────────────────────────────────
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "deposit_payment_intent_id, deposit_amount_paid, deposit_refund_status, date, start_time, shop_id, client_id"
    )
    .eq("id", bookingId)
    .single();

  if (!booking) return json({ error: "Booking not found" }, 404);

  // ── Authorization ─────────────────────────────────────────────────────────
  if (isStaff) {
    // Staff: booking must belong to their shop (superadmin with null shop_id is exempt).
    if (staffShopId !== null && booking.shop_id !== staffShopId) {
      return json({ error: "Forbidden" }, 403);
    }
  } else {
    // Guest: booking must belong to the verified client.
    if (booking.client_id !== clientId) {
      return json({ error: "Unauthorized" }, 401);
    }
  }

  // All subsequent lookups use booking.shop_id — never the client-supplied shopId.
  const bookingShopId = booking.shop_id;

  // ── Deposit check ─────────────────────────────────────────────────────────
  if (!booking.deposit_payment_intent_id) {
    const update: Record<string, unknown> = { status: "cancelled" };
    if (cancelReason) update.cancel_reason = cancelReason;
    await supabase.from("bookings").update(update).eq("id", bookingId);
    sendCancellationSms(supabase, booking);
    return json({ refunded: false, reason: "no_deposit" });
  }

  if (booking.deposit_refund_status !== "none") {
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
    sendCancellationSms(supabase, booking);
    return json({ refunded: booking.deposit_refund_status === "refunded", reason: "already_processed" });
  }

  // ── Refund window ─────────────────────────────────────────────────────────
  const { data: settingsRows } = await supabase
    .from("shop_settings")
    .select("deposit_refund_hours")
    .eq("shop_id", bookingShopId)
    .limit(1);

  const refundHours   = settingsRows?.[0]?.deposit_refund_hours ?? 24;
  const apptDateTime  = new Date(`${booking.date}T${booking.start_time}:00`);
  const hoursUntilAppt = (apptDateTime.getTime() - Date.now()) / 3_600_000;
  const isRefundable  = hoursUntilAppt > refundHours;

  if (!isRefundable) {
    await supabase
      .from("bookings")
      .update({ status: "cancelled", deposit_refund_status: "forfeited" })
      .eq("id", bookingId);
    console.log("[stripe-refund-deposit] deposit forfeited — booking:", bookingId, "hoursUntil:", hoursUntilAppt);
    sendCancellationSms(supabase, booking);
    return json({ refunded: false, reason: "outside_window", hoursUntilAppt });
  }

  // ── Stripe refund ─────────────────────────────────────────────────────────
  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });
  try {
    const refund = await stripe.refunds.create({
      payment_intent: booking.deposit_payment_intent_id,
    });

    await supabase
      .from("bookings")
      .update({ status: "cancelled", deposit_refund_status: "refunded" })
      .eq("id", bookingId);

    console.log("[stripe-refund-deposit] refunded:", refund.id, "booking:", bookingId);
    sendCancellationSms(supabase, booking);
    return json({ refunded: true, amount: booking.deposit_amount_paid, refundId: refund.id });
  } catch (e) {
    console.error("[stripe-refund-deposit] Stripe error:", e);
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
    sendCancellationSms(supabase, booking);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
