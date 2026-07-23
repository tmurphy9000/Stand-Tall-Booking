---
title: Setting Up Online Deposits (Admin)
description: How to enable shop-wide deposits for online bookings, set the deposit percentage, configure the refund window, and allow clients to pre-tip at deposit time.
order: 6
---

Deposits let you collect a portion of the service price upfront when a client books online. This reduces no-shows by giving clients financial skin in the game. The deposit settings live in **Settings → Payments** and require a connected Stripe account.

For what the client experiences during the deposit step, see [Requiring a Deposit at Booking](/help/public-booking-page/booking-deposits).

## Prerequisites

Deposits require Stripe to be connected to your shop. The deposit section only appears in Settings → Payments after you've completed Stripe onboarding. If you haven't connected Stripe yet, see [Connecting Stripe to Your Shop](/help/checkout-payments/connecting-stripe).

## Enabling deposits shop-wide

1. Go to **Settings → Payments**.
2. Under **Deposits**, toggle on **Require deposit for all online bookings**.
3. Set your options (see below), then click **Save deposit settings**.

![Deposit settings in Settings → Payments showing the shop-wide toggle, deposit percentage, refund window, and pre-tip option](/help-assets/screenshots/checkout/deposit-settings.png)

Once enabled, every client booking through your public booking page will be required to pay the deposit before their booking is confirmed.

## Deposit percentage

Enter a number between 1 and 100. The deposit amount the client pays equals their service price × this percentage.

For example, a 25% deposit on a $50 haircut charges the client $12.50 at booking. The remaining $37.50 is collected at the shop at checkout time — and is automatically deducted from the total shown in the checkout screen so you don't double-charge.

## Refund window

The refund window controls how far in advance a client can cancel and still receive their deposit back. Enter the number of hours.

- A refund window of **24** means clients who cancel more than 24 hours before their appointment get a full deposit refund. Cancellations within 24 hours forfeit the deposit.
- A refund window of **0** means deposits are never refunded, regardless of when the client cancels.

The cancellation confirmation email sent to the client states whether the deposit was refunded.

## Pre-tip option

The **Allow pre-tip** toggle lets clients add a tip when they pay their deposit at booking. Preset percentages (0%, 15%, 18%, 20%) and a custom dollar amount option appear during the deposit step. Tips are calculated on the full service price, not the deposit amount.

This is optional — if you'd rather collect tips at the shop, leave it off.

## Per-client deposit override

The shop-wide toggle affects all clients. To require a deposit from a specific client regardless of the shop-wide setting — for example, a repeat no-show — enable the **Deposit Required** toggle on that client's profile. See [Understanding Client Profiles](/help/clients-crm/understanding-client-profiles) for how to find this toggle.

The per-client flag works independently: if shop-wide deposits are off but a specific client has the flag set, that client is still required to pay a deposit.

## Turning deposits off

Toggle off **Require deposit for all online bookings** and save. Existing bookings that already collected a deposit are unaffected — only new bookings stop requiring one.
