---
title: Requiring a Deposit at Booking
description: When clients are asked to pay a deposit, how the deposit amount is calculated, and how refunds work on cancellation.
order: 4
---

A deposit is a partial upfront payment clients make at the time of booking to secure their appointment. From the client's perspective, it appears as an extra step between confirming and the "You're booked!" screen.

## When a client sees the deposit step

A deposit is required in two situations:

**Shop-wide deposits** — the owner has enabled deposits in Settings. Every online booking triggers a deposit for every client.

**Per-client deposits** — an individual client has the "Deposit Required" flag on their client record. This is set manually by the shop on a specific client's profile, typically after repeated no-shows.

If neither condition applies, the booking goes straight from "Confirm Booking" to the success screen — no payment step.

## What the deposit screen looks like

The step is titled **"Final Step — Pay Deposit"** and shows:

- A summary of the deposit amount: *"Deposit required: $X.XX — Charged now to secure your appointment. Refundable if you cancel within the policy window."*
- An optional tip selector (if the shop has pre-tip enabled) with preset percentages (0%, 15%, 18%, 20%) and a custom dollar amount option
- A card entry field (powered by Stripe)
- The total due: **"Pay $X.XX deposit"** (or "deposit + tip" if a tip is added)

The deposit screen does not show in the step counter (1 of 5, 2 of 5, etc.). It appears between step 5 ("Confirm Booking") and the success screen.

## How the deposit amount is calculated

Deposit amount = service price × deposit percentage (set in Settings).

For example, if the service costs $40 and the deposit percentage is 25%, the client pays $10 at booking. The remaining $30 is collected at the shop.

Tip percentages (if pretip is enabled) are calculated on the full service price, not the deposit amount.

## Payment method

Clients enter a credit or debit card. The payment is processed via Stripe. Card details are not stored — Stripe handles the transaction directly. The shop must have Stripe connected (via Settings → Payments) for the deposit step to appear.

## Refunds on cancellation

If a client cancels through the booking page portal or the shop cancels through the dashboard, the deposit refund behavior depends on the shop's cancellation policy. The cancellation email sent to the client states whether the deposit was refunded. If refunded, it typically appears within 5–10 business days.
