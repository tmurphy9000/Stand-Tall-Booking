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

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const supabaseUrl    = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeKey      = Deno.env.get("STRIPE_SECRET_KEY");

  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server configuration error" }, 500);

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let body: {
    bookingId?: string;
    clientId?: string;
    phone?: string;
    otpCode?: string;
    newDate?: string;
    newStartTime?: string;
    newEndTime?: string;
  };
  try { body = await req.json(); } catch { return json({ error: "Invalid request body" }, 400); }

  const { bookingId, clientId, otpCode, newDate, newStartTime, newEndTime } = body;
  const phone = normalizePhone(body.phone || "");

  if (!bookingId || !phone || !otpCode || !newDate || !newStartTime || !newEndTime) {
    return json({ error: "bookingId, phone, otpCode, newDate, newStartTime, and newEndTime are required" }, 400);
  }

  // ── Verify OTP ────────────────────────────────────────────────────────────
  const { data: otp } = await supabase
    .from("otp_codes")
    .select("id")
    .eq("phone", phone)
    .eq("code", otpCode)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!otp) return json({ error: "Invalid or expired verification code" }, 400);

  await supabase.from("otp_codes").update({ used: true }).eq("id", otp.id);

  // ── Ownership check ───────────────────────────────────────────────────────
  const { data: client } = await supabase
    .from("clients")
    .select("id, name, phone, email, sms_opt_in")
    .or(`phone.eq.${phone},phone.eq.+1${phone},phone.eq.1${phone}`)
    .maybeSingle();

  if (!client) return json({ error: "No account found for this phone number" }, 404);
  if (clientId && client.id !== clientId) return json({ error: "Unauthorized" }, 401);

  const { data: oldBooking } = await supabase
    .from("bookings")
    .select("id, date, start_time, end_time, status, shop_id, client_id, barber_id, barber_name, service_id, service_name, duration, price, visit_type, deposit_payment_intent_id, deposit_amount_paid, deposit_refund_status")
    .eq("id", bookingId)
    .single();

  if (!oldBooking) return json({ error: "Booking not found" }, 404);
  if (oldBooking.client_id !== client.id) return json({ error: "Unauthorized" }, 401);
  if (oldBooking.status === "cancelled") return json({ error: "Booking is already cancelled" }, 400);

  const bookingShopId = oldBooking.shop_id;

  // ── Conflict check for new slot ───────────────────────────────────────────
  const { data: conflicts } = await supabase
    .from("bookings")
    .select("id")
    .eq("shop_id", bookingShopId)
    .eq("barber_id", oldBooking.barber_id)
    .eq("date", newDate)
    .neq("status", "cancelled")
    .neq("id", bookingId)
    .lt("start_time", newEndTime)
    .gt("end_time", newStartTime);

  if (conflicts && conflicts.length > 0) {
    return json({ error: "That time slot is no longer available. Please choose another." }, 409);
  }

  // ── Shop info ─────────────────────────────────────────────────────────────
  const [shopRes, settingsRes] = await Promise.all([
    supabase.from("shops").select("url_slug").eq("id", bookingShopId).maybeSingle(),
    supabase.from("shop_settings").select("shop_name, deposit_refund_hours").eq("shop_id", bookingShopId).maybeSingle(),
  ]);
  const shopSlug    = shopRes.data?.url_slug ?? null;
  const shopName    = settingsRes.data?.shop_name ?? "Stand Tall Barbershop";
  const refundHours = settingsRes.data?.deposit_refund_hours ?? 24;

  // ── Handle deposit on old booking ─────────────────────────────────────────
  let depositRefunded = false;

  if (!oldBooking.deposit_payment_intent_id) {
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
  } else if (oldBooking.deposit_refund_status === "refunded" || oldBooking.deposit_refund_status === "forfeited") {
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
    depositRefunded = oldBooking.deposit_refund_status === "refunded";
  } else {
    const hoursUntil = (new Date(`${oldBooking.date}T${oldBooking.start_time}:00`).getTime() - Date.now()) / 3_600_000;

    if (hoursUntil > refundHours && stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
        await stripe.refunds.create({ payment_intent: oldBooking.deposit_payment_intent_id });
        await supabase.from("bookings").update({ status: "cancelled", deposit_refund_status: "refunded" }).eq("id", bookingId);
        depositRefunded = true;
      } catch (e) {
        console.error("[reschedule-client-booking] Stripe refund error:", e);
        await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
      }
    } else {
      await supabase.from("bookings").update({ status: "cancelled", deposit_refund_status: "forfeited" }).eq("id", bookingId);
    }
  }

  // ── Create new booking ────────────────────────────────────────────────────
  const { data: newBooking, error: insertError } = await supabase
    .from("bookings")
    .insert({
      shop_id:      bookingShopId,
      barber_id:    oldBooking.barber_id,
      barber_name:  oldBooking.barber_name,
      service_id:   oldBooking.service_id,
      service_name: oldBooking.service_name,
      client_id:    client.id,
      client_name:  client.name,
      date:         newDate,
      start_time:   newStartTime,
      end_time:     newEndTime,
      duration:     oldBooking.duration,
      price:        oldBooking.price,
      final_price:  oldBooking.price,
      status:       "scheduled",
      visit_type:   oldBooking.visit_type || "online",
    })
    .select("id")
    .single();

  if (insertError || !newBooking) {
    console.error("[reschedule-client-booking] Failed to create new booking:", insertError);
    return json({ error: "Failed to create rescheduled booking" }, 500);
  }

  console.log("[reschedule-client-booking] rescheduled:", bookingId, "→", newBooking.id, "new date:", newDate, newStartTime);

  // ── Reschedule SMS ────────────────────────────────────────────────────────
  if (client.sms_opt_in && client.phone) {
    const portalUrl = shopSlug ? `standtallbooking.com/book/${shopSlug}/appointments` : null;
    const msg =
      `Your appointment at ${shopName} has been rescheduled to ${smsFormatDate(newDate)} at ${smsFormatTime(newStartTime)}. ` +
      `${portalUrl ? `View your appointments at ${portalUrl}. ` : ""}` +
      `Reply STOP to opt out.`;
    const { ok, error: smsErr } = await sendSms(client.phone, msg);
    if (!ok) console.warn("[reschedule-client-booking] SMS failed:", smsErr);
  }

  // ── Reschedule email (via sendBookingConfirmation) ────────────────────────
  if (client.email || (client.sms_opt_in && client.phone)) {
    const confirmBody = {
      client_name:  client.name,
      client_email: client.email || undefined,
      barber_name:  oldBooking.barber_name,
      service_name: oldBooking.service_name,
      date:         newDate,
      start_time:   newStartTime,
      end_time:     newEndTime,
      shop_name:    shopName || undefined,
      shop_slug:    shopSlug || undefined,
    };
    const { error: confirmErr } = await supabase.functions.invoke("sendBookingConfirmation", { body: confirmBody });
    if (confirmErr) console.warn("[reschedule-client-booking] sendBookingConfirmation failed:", confirmErr);
  }

  return json({ success: true, newBookingId: newBooking.id, depositRefunded });
});
