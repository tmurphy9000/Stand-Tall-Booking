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

function buildCancellationHtml(params: {
  clientName: string;
  barberName: string;
  serviceName: string;
  date: string;
  startTime: string;
  shopName: string;
  shopSlug?: string | null;
  refunded: boolean;
  depositAmountCents: number;
}): string {
  const { clientName, barberName, serviceName, date, startTime, shopName, shopSlug, refunded, depositAmountCents } = params;
  const [y, m, d] = date.split("-").map(Number);
  const dateLabel = new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const [h, min] = startTime.split(":").map(Number);
  const timeLabel = `${h % 12 || 12}:${String(min).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6993eba91209ee0a1089f355/fd9cfe023_6f5fd5cc-8fc9-4041-9d87-c24e77a3bc58.png";
  const bookUrl = shopSlug ? `standtallbooking.com/book/${shopSlug}` : null;

  let depositNote = "";
  if (depositAmountCents > 0) {
    const amount = `$${(depositAmountCents / 100).toFixed(2)}`;
    depositNote = refunded
      ? `<p style="margin:16px 0 0;color:#8B9A7E;font-size:13px">Your ${amount} deposit has been refunded and will appear within 5–10 business days.</p>`
      : `<p style="margin:16px 0 0;color:#888;font-size:13px">Your ${amount} deposit was not refunded per our cancellation policy.</p>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
        <tr><td align="center" style="padding-bottom:32px">
          <img src="${logoUrl}" width="72" height="72" style="border-radius:16px;display:block;margin:0 auto 14px" alt="${shopName}">
          <span style="color:#fff;font-size:18px;font-weight:700">${shopName}</span>
        </td></tr>
        <tr><td style="background:#141414;border-radius:20px;padding:32px;border:1px solid #2a2a2a">
          <p style="margin:0 0 6px;color:#8B9A7E;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px">Appointment Cancelled</p>
          <h1 style="margin:0 0 8px;color:#fff;font-size:24px;font-weight:800">Your appointment has been cancelled.</h1>
          <p style="margin:0 0 24px;color:#888;font-size:15px">Hi ${clientName},</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#888;font-size:13px;width:120px">Barber</td><td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#fff;font-size:13px;font-weight:600">${barberName}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#888;font-size:13px">Service</td><td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#fff;font-size:13px;font-weight:600">${serviceName}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#888;font-size:13px">Date</td><td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#fff;font-size:13px;font-weight:600">${dateLabel}</td></tr>
            <tr><td style="padding:10px 0;color:#888;font-size:13px">Time</td><td style="padding:10px 0;color:#fff;font-size:13px;font-weight:600">${timeLabel}</td></tr>
          </table>
          ${depositNote}
          ${bookUrl ? `<p style="margin:20px 0 0;color:#888;font-size:13px">Book again at <a href="https://${bookUrl}" style="color:#8B9A7E">${bookUrl}</a>.</p>` : ""}
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center">
          <p style="margin:0;color:#333;font-size:11px">© ${new Date().getFullYear()} ${shopName}. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const supabaseUrl    = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeKey      = Deno.env.get("STRIPE_SECRET_KEY");
  const resendKey      = Deno.env.get("RESEND_API_KEY");

  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server configuration error" }, 500);

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let body: { bookingId?: string; clientId?: string; phone?: string; otpCode?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request body" }, 400); }

  const { bookingId, clientId, otpCode } = body;
  const phone = normalizePhone(body.phone || "");

  if (!bookingId || !phone || !otpCode) {
    return json({ error: "bookingId, phone, and otpCode are required" }, 400);
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

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, date, start_time, status, shop_id, client_id, service_name, barber_name, deposit_payment_intent_id, deposit_amount_paid, deposit_refund_status")
    .eq("id", bookingId)
    .single();

  if (!booking) return json({ error: "Booking not found" }, 404);
  if (booking.client_id !== client.id) return json({ error: "Unauthorized" }, 401);
  if (booking.status === "cancelled") return json({ error: "Booking is already cancelled" }, 400);

  const bookingShopId = booking.shop_id;

  // ── Shop info for notifications ───────────────────────────────────────────
  const [shopRes, settingsRes] = await Promise.all([
    supabase.from("shops").select("url_slug").eq("id", bookingShopId).maybeSingle(),
    supabase.from("shop_settings").select("shop_name, deposit_refund_hours").eq("shop_id", bookingShopId).maybeSingle(),
  ]);
  const shopSlug    = shopRes.data?.url_slug ?? null;
  const shopName    = settingsRes.data?.shop_name ?? "Stand Tall Barbershop";
  const refundHours = settingsRes.data?.deposit_refund_hours ?? 24;

  // ── Deposit handling ──────────────────────────────────────────────────────
  let refunded = false;
  const depositAmountCents: number = booking.deposit_amount_paid ?? 0;

  if (!booking.deposit_payment_intent_id) {
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
  } else if (booking.deposit_refund_status === "refunded" || booking.deposit_refund_status === "forfeited") {
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
    refunded = booking.deposit_refund_status === "refunded";
  } else {
    const hoursUntil = (new Date(`${booking.date}T${booking.start_time}:00`).getTime() - Date.now()) / 3_600_000;

    if (hoursUntil > refundHours && stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
        await stripe.refunds.create({ payment_intent: booking.deposit_payment_intent_id });
        await supabase.from("bookings").update({ status: "cancelled", deposit_refund_status: "refunded" }).eq("id", bookingId);
        refunded = true;
        console.log("[cancel-client-booking] deposit refunded for booking:", bookingId);
      } catch (e) {
        console.error("[cancel-client-booking] Stripe refund error:", e);
        await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
      }
    } else {
      await supabase.from("bookings").update({ status: "cancelled", deposit_refund_status: "forfeited" }).eq("id", bookingId);
      console.log("[cancel-client-booking] deposit forfeited for booking:", bookingId);
    }
  }

  // ── Cancellation SMS ──────────────────────────────────────────────────────
  if (client.sms_opt_in && client.phone) {
    const bookLink = shopSlug ? `Book again at standtallbooking.com/book/${shopSlug}.` : "";
    const msg = `Your appointment at ${shopName} on ${smsFormatDate(booking.date)} at ${smsFormatTime(booking.start_time)} has been cancelled. ${bookLink} Reply STOP to opt out.`.trim();
    const { ok, error: smsErr } = await sendSms(client.phone, msg);
    if (!ok) console.warn("[cancel-client-booking] SMS failed:", smsErr);
  }

  // ── Cancellation email ────────────────────────────────────────────────────
  if (client.email && resendKey) {
    const html = buildCancellationHtml({
      clientName: client.name,
      barberName: booking.barber_name,
      serviceName: booking.service_name,
      date: booking.date,
      startTime: booking.start_time,
      shopName,
      shopSlug,
      refunded,
      depositAmountCents,
    });
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Stand Tall Booking <onboarding@resend.dev>",
        to: [client.email],
        subject: `Appointment Cancelled — ${shopName}`,
        html,
      }),
    });
    if (!emailRes.ok) console.warn("[cancel-client-booking] Email failed:", await emailRes.text());
  }

  console.log("[cancel-client-booking] cancelled booking:", bookingId, "| refunded:", refunded);
  return json({ success: true, refunded, depositAmountCents });
});
