---
title: The Client Portal — Viewing and Canceling Appointments
description: How clients view their upcoming appointments and cancel them from the booking page, including deposit refund behavior.
order: 3
---

Clients can view their upcoming appointments and cancel them directly from your shop's booking page — no app, no account login, just a phone number and verification code.

## How to access it

On the booking page landing screen, tap **View my appointments**. The portal opens in three steps:

1. **Enter phone number** — the number the client booked with
2. **Enter the 6-digit code** sent by SMS to that number
3. **See the appointment list**

The portal is part of the same booking page at `standtallbooking.com/book/your-slug` — the URL doesn't change. There's no separate `/appointments` page.

![Client appointments portal](/help-assets/screenshots/booking/client-portal.png)

## What clients see

Each appointment card shows:

- Service name
- "with [Barber name]"
- Date (as a colored chip, e.g. *Tue, Jul 14*)
- Time range (e.g. *10:00 AM – 10:30 AM*)

Only **upcoming** appointments are shown. Past and cancelled appointments are not listed.

## Canceling an appointment

Each card has a red **Cancel** button. Tapping it immediately cancels the appointment — there's no confirmation prompt. The card disappears from the list. The cancellation is visible in your dashboard immediately.

**Deposit refund behavior:** If the appointment had a deposit attached, the cancel action routes through the deposit-refund logic. Whether the deposit is refunded depends on the shop's cancellation policy window. Clients receive a cancellation email if they have one on file, which states whether their deposit was refunded.

## What clients cannot do from the portal

- **Reschedule** — there is no reschedule button. Clients who want to move an appointment need to cancel and rebook, or contact the shop directly.
- **Edit appointment details** — service, barber, and time cannot be changed.
- **View past appointments** — only future bookings appear.

## Session behavior

If a client verified themselves earlier in the same browser session, the portal may open directly without requiring the phone/OTP flow again — they'll land on the "Welcome back" screen instead, which gives them a shortcut to view their appointments.
