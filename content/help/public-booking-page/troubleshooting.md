---
title: Troubleshooting Common Client Booking Issues
description: Solutions for the most common problems clients encounter on the public booking page — OTP issues, no slots showing, wrong URLs, and more.
order: 6
---

## "I never received a verification code"

**Check the phone number.** The code is sent to the exact number entered. Ask the client to double-check that they typed it correctly, including the area code.

**Wait a moment.** SMS delivery can take 30–60 seconds depending on the carrier. Ask the client to wait before retrying.

**Use "Resend code."** A "Resend code" link appears below the code entry box. Tapping it sends a fresh code and resets the attempt counter.

**Check the spam folder.** Some carriers flag short-code messages as spam. The client should check their SMS spam or filtered messages folder.

**Carrier filtering.** Verification codes are sent from a shared SMS number. A small number of carriers block short-code messages by default. If the client still can't receive a code, ask them to contact the shop directly to book — or try a different phone number if they have one.

---

## "I entered the code but it says it's wrong"

There is a **3-attempt limit** before the code input locks. If the client hits the limit, they'll see "Too many failed attempts. Please request a new code." — they need to tap "Resend code" to get a new one and reset the counter.

Common causes:
- The client is entering an old code (a previously sent one). Only the most recent code is valid.
- A typo (a "1" vs "l", "0" vs "O" confusion on smaller screens).
- The code expired (codes have a limited validity window — if too much time passed, request a new one).

---

## "It says my phone number is already registered but I'm a first-time client"

This means a client record already exists for that phone number. A few things could cause this:

- The shop may have manually created a client record for them (from a walk-in or phone booking).
- Someone else in the household may have booked before with the same number.
- The client may have booked at the shop before and forgotten.

**What to do:** Tap the **Go to Returning Client →** button that appears. Entering the same phone number on the Returning Client screen will find the account immediately — no OTP is sent. The client will be recognized and taken into the booking flow.

---

## "No time slots are showing for a day"

When you tap a date and no slots appear:

- The selected barber is off that day.
- The barber's calendar is fully booked for that date.
- The shop is closed (a holiday or block time was set by the shop).

**Try the ⚡ Next Available button.** This searches the next 60 days and returns the earliest open slots across all days — it's the fastest way past a stretch of full days.

**Try choosing Any Barber.** If a specific barber is selected and their calendar is full, switching to Any Barber shows the first available slot from any active barber.

If no slots appear at all on any day, the shop may be closed for an extended period or the calendar may not be configured. Contact the shop directly.

---

## "I'm on the booking page but I see the wrong shop"

Every shop has a unique booking URL ending in its slug: `standtallbooking.com/book/your-slug`. If a client landed on the wrong shop's page, they have the wrong URL.

Ask the client to get the correct link directly from your shop — the booking link in your Google Business profile, your Instagram bio, your website, etc.

There is no directory or search on the booking page — clients must have the correct URL.

---

## "My deposit payment was declined"

Common reasons for a card decline:

- Incorrect card number, expiry, or CVC
- Insufficient funds
- The bank flagged it as an unusual transaction (the client should check with their bank or try a different card)
- Prepaid or virtual cards are sometimes blocked

The client should re-enter their card details and try again, or use a different card. The booking is **not saved** until the deposit is successfully charged — if the payment fails, the appointment slot is not held. The client should complete payment promptly so the slot doesn't fill.

---

## "I forgot to add the appointment to my calendar"

After booking, the "You're booked!" screen shows **Add to Google Calendar** and **Add to Apple Calendar** buttons. These are only visible immediately after booking.

If a client navigated away, they can get the details from:

- The **confirmation email** (if they provided an email address)
- The **client portal** — tap "View my appointments" on the booking page, verify by phone, and the upcoming appointment is listed with the full date and time

Clients can then manually add the event to their calendar using the details shown.

---

## "I want to reschedule, not cancel"

The client portal (accessible from the booking page landing screen) only shows a **Cancel** button — there is no reschedule option. To change the appointment time or barber, the client needs to:

1. Cancel the current appointment through the portal
2. Rebook using the booking flow

Alternatively, the client can contact the shop directly to request a reschedule — the shop can move the appointment from the dashboard without the client having to rebook.
