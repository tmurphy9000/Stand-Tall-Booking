---
title: How Clients Book an Appointment
description: A step-by-step walkthrough of the public booking flow from the landing page through confirmation.
order: 1
---

Clients book appointments at your shop's unique booking page — `standtallbooking.com/book/your-slug`. The flow is mobile-first, runs entirely in the browser, and requires no app download.

## The landing page

The first screen shows your shop logo, name, and three buttons:

- **First Time Client** — creates a new account
- **Returning Client** — looks up an existing account by phone number
- **View my appointments** — shows upcoming bookings for a verified client

Clients must identify themselves before booking. This links every appointment to a client record in your dashboard. (See [First-Time vs. Returning Client Verification](/help/public-booking-page/client-verification) for the full identity flow.)

## Step 1 of 5 — Choose Your Barber

Clients see an **Any Barber** card at the top (first available from all active barbers) and individual barber cards below it. The barber's photo appears if one is set. Tapping a card locks in that barber for the rest of the booking.

## Step 2 of 5 — Choose a Service

Services are listed with name, duration, optional description, and price. The duration shown is specific to the selected barber if that barber has a custom duration for the service; otherwise it shows the service default. Services the selected barber doesn't offer are filtered out.

![Service selection step on the booking page](/help-assets/screenshots/booking/service-selection.png)

## Add a Guest? (optional)

After service selection, clients are asked whether they want to add a guest — a back-to-back appointment for a second person at the same visit. If yes, they choose the guest's name, service, barber, and timing (back-to-back or same time). If no, they proceed directly to date and time.

## Step 3 of 5 — Pick a Date & Time

The date strip shows up to 60 days. Days when the selected barber is off or fully booked are grayed out and not selectable. Tapping a date loads available time slots in 15-minute increments during the barber's working hours. Taken slots appear with strikethrough text and are disabled.

The **⚡ Next Available** button searches across all upcoming days and shows the next 5 open slots as quick-pick cards. Tapping "See more times →" loads 5 more.

![Date and time picker on the booking page](/help-assets/screenshots/booking/time-slot-picker.png)

## Step 4 of 5 — Your Info

Returning clients who are already recognized skip this step (their name, phone, and email are pre-filled). New clients fill in their full name, phone number, and email address.

## Step 5 of 5 — Confirm Booking

The confirmation step shows a full summary: barber, service (with price), date and time, and client name/phone/email. Clients can also:

- **Apply a promo code** (if the shop has active codes)
- **Agree to the cancellation policy** — required before confirming if the shop has one enabled; the policy text is shown in a scrollable box with an "I agree" checkbox
- **Opt in to SMS** — a separate opt-in checkbox for appointment confirmations and reminders; not required to book

Clicking **Confirm Booking** submits the appointment.

## Deposit (if required)

If the shop requires a deposit or the client has a per-client deposit flag set, a **Pay Deposit** step appears after confirming. Clients enter card details via Stripe and pay before the appointment is saved. See [Requiring a Deposit at Booking](/help/public-booking-page/booking-deposits).

## "You're booked!"

After successful submission, the confirmation screen shows the booking summary and two buttons to save the appointment to Google Calendar or Apple Calendar. The booking now appears in your dashboard with status **Scheduled**.

![Booking confirmation screen showing appointment summary and calendar buttons](/help-assets/screenshots/booking/booking-confirmation.png)
