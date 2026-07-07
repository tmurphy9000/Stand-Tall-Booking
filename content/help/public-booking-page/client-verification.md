---
title: First-Time vs. Returning Client Verification
description: How the identity system works — phone-based OTP for new clients, instant lookup for returning ones.
order: 2
---

Every booking is linked to a client record. The landing page asks clients to identify themselves before they can proceed, using different flows depending on whether they've booked before.

## The landing page choices

Three buttons appear:

| Button | Who it's for |
|---|---|
| **First Time Client** | Someone booking for the first time at this shop |
| **Returning Client** | Someone who has booked before and has a client record |
| **View my appointments** | Any client who wants to see or cancel upcoming bookings |

![OTP verification screen](/help-assets/screenshots/booking/otp-verification.png)

## First-time client flow

Clicking **First Time Client** opens the "Create Your Account" form, which collects:

- First name and last name (required)
- Email address (required)
- Phone number (required — used for verification and reminders)

Submitting the form sends a **6-digit verification code via SMS** to the phone number entered. The client enters the code on the next screen ("Check your texts"). The "Verify & Continue" button activates once all 6 digits are entered.

**Resending:** A "Resend code" link appears below the input. Tapping it resets the attempt counter and sends a new code.

**Attempt limit:** After 3 incorrect entries, the input is locked with the message "Too many failed attempts. Please request a new code." Clicking "Resend code" resets the counter.

**Phone already registered:** If the entered phone number already has an account, the form shows "Looks like you already have an account with that number" with a **Go to Returning Client →** button. The client doesn't need to create a new account.

## Returning client flow

Clicking **Returning Client** opens the "Find Your Account" screen, which asks only for a phone number. The system looks up the record immediately — **no OTP is sent**. If a match is found, the client sees a brief "Welcome back, [Name]!" screen and is taken directly into the booking flow with their name, phone, and email pre-filled.

If no match is found, the screen shows "We don't have an account with that number" with a "First time client? Create an account →" link.

## Session persistence

Once a client is verified, a session is saved in the browser's localStorage tied to the shop slug. On their next visit to the same booking page, they land on a "Welcome back, [Name]!" screen with options to book again or view appointments — skipping the identity steps entirely. They can tap "Not you?" to clear the session and start fresh.

## What gets created

When a first-time client completes verification, a client record is created in your dashboard with their name, email, and phone. It appears immediately in **Clients** and can be managed from there.
