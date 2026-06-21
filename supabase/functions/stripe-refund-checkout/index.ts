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

  // Verify authenticated user
  const authHeader = req.headers.get("authorization") || "";
  const jwt = authHeader.replace(/^bearer\s+/i, "");
  if (!jwt) return json({ error: "Unauthorized" }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: { user }, error: authError } = await adminClient.auth.getUser(jwt);
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  // Verify the caller has refund permission
  const { data: barber } = await adminClient
    .from("barbers")
    .select("permission_level, is_active, access_level_id")
    .eq("email", user.email)
    .single();

  const isSuperAdmin = user.email === "tmurphy9000@gmail.com";

  let hasRefundPermission = false;
  if (barber?.access_level_id) {
    const { data: perm } = await adminClient
      .from("access_level_permissions")
      .select("permission_value")
      .eq("access_level_id", barber.access_level_id)
      .eq("permission_key", "checkout.refunds")
      .maybeSingle();
    hasRefundPermission = perm?.permission_value === "modify" || perm?.permission_value === "modify_with_limit";
  } else {
    // Legacy fallback: barbers not yet migrated to access_level_id
    hasRefundPermission = barber?.permission_level === "owner" || barber?.permission_level === "manager";
  }

  if (!isSuperAdmin && !hasRefundPermission) return json({ error: "Forbidden" }, 403);

  let body: { bookingId: string; amountCents?: number; reason?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const { bookingId, amountCents, reason } = body;
  if (!bookingId) return json({ error: "bookingId is required" }, 400);

  const { data: booking } = await adminClient
    .from("bookings")
    .select("stripe_payment_intent_id, final_price, status, client_name")
    .eq("id", bookingId)
    .single();

  if (!booking?.stripe_payment_intent_id) {
    return json({ error: "No Stripe payment found for this booking" }, 400);
  }

  if (booking.status === "refunded") {
    return json({ error: "This booking has already been refunded" }, 400);
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

  const refundParams: Stripe.RefundCreateParams = {
    payment_intent: booking.stripe_payment_intent_id,
  };
  if (amountCents) refundParams.amount = amountCents;
  if (reason) refundParams.reason = "requested_by_customer";

  try {
    const refund = await stripe.refunds.create(refundParams);

    const isFullRefund = !amountCents ||
      amountCents >= Math.round((booking.final_price ?? 0) * 100);

    if (isFullRefund) {
      await adminClient.from("bookings").update({ status: "refunded" }).eq("id", bookingId);
    }

    console.log("[stripe-refund-checkout] refund:", refund.id, "booking:", bookingId);
    return json({ refunded: true, refundId: refund.id, amount: refund.amount });
  } catch (e) {
    console.error("[stripe-refund-checkout] Stripe error:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
