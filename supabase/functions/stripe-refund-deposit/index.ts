import Stripe from "https://esm.sh/stripe@22.2.1?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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

  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!secretKey || !supabaseUrl || !serviceRoleKey) {
    return json({ error: "Server configuration error" }, 500);
  }

  let body: { bookingId: string; shopId: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const { bookingId, shopId } = body;
  if (!bookingId || !shopId) return json({ error: "bookingId and shopId are required" }, 400);

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: booking } = await supabase
    .from("bookings")
    .select("deposit_payment_intent_id, deposit_amount_paid, deposit_refund_status, date, start_time")
    .eq("id", bookingId)
    .single();

  if (!booking?.deposit_payment_intent_id) {
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
    return json({ refunded: false, reason: "no_deposit" });
  }

  if (booking.deposit_refund_status !== "none") {
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
    return json({ refunded: booking.deposit_refund_status === "refunded", reason: "already_processed" });
  }

  const { data: settingsRows } = await supabase
    .from("shop_settings")
    .select("deposit_refund_hours")
    .eq("shop_id", shopId)
    .limit(1);

  const refundHours = settingsRows?.[0]?.deposit_refund_hours ?? 24;
  const apptDateTime = new Date(`${booking.date}T${booking.start_time}:00`);
  const hoursUntilAppt = (apptDateTime.getTime() - Date.now()) / 3_600_000;
  const isRefundable = hoursUntilAppt > refundHours;

  if (!isRefundable) {
    await supabase
      .from("bookings")
      .update({ status: "cancelled", deposit_refund_status: "forfeited" })
      .eq("id", bookingId);
    console.log("[stripe-refund-deposit] deposit forfeited — booking:", bookingId, "hoursUntil:", hoursUntilAppt);
    return json({ refunded: false, reason: "outside_window", hoursUntilAppt });
  }

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
    return json({ refunded: true, amount: booking.deposit_amount_paid, refundId: refund.id });
  } catch (e) {
    console.error("[stripe-refund-deposit] Stripe error:", e);
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
