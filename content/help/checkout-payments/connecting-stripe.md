---
title: Connecting Stripe to Your Shop
description: How to complete the Stripe Connect onboarding flow so your shop can accept card payments, collect online deposits, and process refunds.
order: 7
---

Stand Tall Booking uses Stripe to process card payments. Connecting your Stripe account takes about five minutes and is required before you can accept cards at checkout, collect online deposits, or issue refunds through the app.

## What Stripe connection enables

| Feature | Requires Stripe |
|---|---|
| Card payments at checkout (manual entry or reader) | Yes |
| Online deposits at booking | Yes |
| Refunds from the Transactions page | Yes |
| Cash payments | No |
| Payroll calculations | No |

## How to connect

1. Go to **Settings → Payments**.
2. Click **Connect Stripe**.
3. You'll be redirected to Stripe's website to authorize the connection. If you already have a Stripe account, sign in. If not, you can create one during the process — Stripe walks you through setting up your bank account for payouts.
4. After completing Stripe's steps, you're automatically redirected back to Stand Tall Booking with a green "Stripe account connected" confirmation.

The connected account ID is shown in the Payments settings section for your records. Payments go directly from your clients' cards into your Stripe account — Stand Tall Booking does not hold or handle funds.

## After connecting

Once connected, the **Deposits** section and **Card Readers** section appear in Settings → Payments. You don't need to do anything else just to take card payments at checkout — the card input appears automatically as a payment method option when you open a checkout.

## Reconnecting after a session expiry

Stripe's authorization session can time out if you navigate away mid-flow. If this happens, you'll see a message in Settings → Payments that says "Stripe session expired." Click **Connect Stripe** again to restart the process — it's the same flow and picks up where it left off.

## Disconnecting Stripe

Click **Disconnect** in the Payments settings to remove the Stripe connection. Card payments, deposits, and refunds will stop working immediately. Your existing Stripe account and payout history are unaffected — disconnecting only removes the link between that account and your Stand Tall Booking shop. You can reconnect at any time.

## Card readers (Stripe Terminal)

If you use a physical card reader, you'll also need to set up a terminal location and register the reader in Settings → Payments after connecting Stripe. See the Card Readers section in Settings → Payments for setup steps.
