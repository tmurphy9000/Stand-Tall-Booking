import Stripe from "https://esm.sh/stripe@22.2.1?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
console.log("[stripe-webhook] STRIPE_SECRET_KEY present:", !!secretKey);
console.log("[stripe-webhook] STRIPE_WEBHOOK_SECRET present:", !!webhookSecret);

const stripe = secretKey ? new Stripe(secretKey, { apiVersion: "2024-06-20" }) : null;
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Maps Stripe price IDs to our internal plan tiers.
const PRICE_TIER_MAP: Record<string, string> = {};
for (const [tier, envVar] of [["basic", "STRIPE_PRICE_BASIC"], ["pro", "STRIPE_PRICE_PRO"], ["elite", "STRIPE_PRICE_ELITE"]]) {
  const priceId = Deno.env.get(envVar);
  if (priceId) PRICE_TIER_MAP[priceId] = tier;
}

function mapStripeStatus(status: string): string {
  switch (status) {
    case "canceled":
      return "cancelled";
    case "active":
    case "past_due":
    case "trialing":
      return status;
    default:
      return status;
  }
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[stripe-webhook] listUsers error:", error);
      return null;
    }
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < perPage) return null;
    page++;
  }
}

async function resolveTierFromSubscription(subscriptionId: string | undefined): Promise<string | undefined> {
  if (!subscriptionId || !stripe) return undefined;
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price?.id;
    return priceId ? PRICE_TIER_MAP[priceId] : undefined;
  } catch (e) {
    console.error("[stripe-webhook] failed to retrieve subscription for tier lookup:", e);
    return undefined;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!stripe || !webhookSecret) {
    console.error("[stripe-webhook] missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET env var");
    return new Response("Server configuration error", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.error("[stripe-webhook] missing stripe-signature header");
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret, undefined, cryptoProvider);
  } catch (e) {
    console.error("[stripe-webhook] signature verification failed:", e);
    return new Response("Invalid signature", { status: 400 });
  }

  console.log("[stripe-webhook] received event:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_details?.email ?? session.customer_email ?? undefined;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const plan = session.metadata?.plan;

        console.log("[stripe-webhook] checkout.session.completed:", { email, subscriptionId, customerId, plan });

        if (!email) {
          console.error("[stripe-webhook] checkout.session.completed missing customer email");
          break;
        }

        const userId = await findUserIdByEmail(email);
        if (!userId) {
          console.error("[stripe-webhook] no auth user found for email:", email);
          break;
        }

        const tier = plan ?? (await resolveTierFromSubscription(subscriptionId));

        const { error } = await supabaseAdmin.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          tier,
          status: "active",
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        if (error) console.error("[stripe-webhook] failed to upsert subscription:", error);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("[stripe-webhook] customer.subscription.deleted:", subscription.id);

        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subscription.id);

        if (error) console.error("[stripe-webhook] failed to update cancelled subscription:", error);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price?.id;
        const tier = priceId ? PRICE_TIER_MAP[priceId] : undefined;
        const status = mapStripeStatus(subscription.status);

        console.log("[stripe-webhook] customer.subscription.updated:", { id: subscription.id, priceId, tier, status });

        const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
        if (tier) update.tier = tier;

        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update(update)
          .eq("stripe_subscription_id", subscription.id);

        if (error) console.error("[stripe-webhook] failed to update subscription:", error);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        console.log("[stripe-webhook] invoice.payment_failed:", { subscriptionId });

        if (!subscriptionId) break;

        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subscriptionId);

        if (error) console.error("[stripe-webhook] failed to mark subscription past_due:", error);
        break;
      }

      default:
        console.log("[stripe-webhook] unhandled event type:", event.type);
    }
  } catch (e) {
    console.error("[stripe-webhook] error handling event:", e);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
