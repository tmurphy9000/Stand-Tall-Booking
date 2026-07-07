---
title: The Walk-In and Check-In Flow
description: What clients see at the kiosk — the check-in flow for existing appointments and the walk-in flow for booking on the spot.
order: 2
---

The kiosk landing screen has two buttons: **Check In** (for clients with an existing appointment) and **Walk In** (for clients who want to book on the spot). Walk In only appears if you've enabled it in Settings → Kiosk.

![Kiosk landing screen and walk-in entry form](/help-assets/screenshots/kiosk/kiosk-landing.png)

## Check-in flow (existing appointments)

Tapping **Check In** shows today's appointment list with a search box at the top. Clients can:

- **Scroll and tap their name** from the list
- **Search by name** using the search field
- **Switch to phone search** — a "Search by phone number" option at the bottom lets clients enter their phone number if they can't find their name in the list

After selecting an appointment, the client sees a confirmation screen with their service, time, and barber name, plus an estimated wait time if other clients are booked ahead of them. They tap **Confirm Check-In** to complete it. The appointment status changes to **checked_in** in your dashboard immediately.

After checking in, the screen shows a full-page green confirmation ("You're checked in!") with the wait estimate. It auto-returns to the landing screen after 12 seconds, or the client can tap **Done**.

## Walk-in flow (booking on the spot)

Tapping **Walk In** starts a short form-based booking flow:

### Step 1 — Your info

The client enters:

- **First name** and **last name**
- **Phone number**

The phone number is used to send an SMS confirmation and link them to a client record. After filling in all three fields, they tap **Next — Choose a Service**.

### Step 2 — Choose a Service

The client sees all services available at your shop, each showing the service name, duration, and price. Tapping a service moves to the time slot screen.

### Step 3 — Available Times Today

The client sees available time slots for today, shown in a 2-column grid. Each tile shows the start time and the barber's name. Only times that are genuinely open are shown — the kiosk enforces working hours, minimum booking notice, and existing bookings (see [How Kiosk Availability Works](/help/walk-in-kiosk/how-kiosk-availability-works)).

![Walk-in slot selection screen](/help-assets/screenshots/kiosk/kiosk-walk-in-slots.png)

Tapping a slot immediately creates the booking and sends an SMS confirmation to the client's phone.

**If no slots are available today**, the screen shows "No available slots today" with a **Book for a different day →** button. Tapping it opens the multi-day booking flow (see below).

### Confirmation

After booking, the screen shows a green "You're booked!" confirmation with the time and barber name. A confirmation text is sent to the client's phone. The screen auto-returns to the landing after 12 seconds.

## Booking for a different day

From the walk-in slots screen (today's view), a **Book for a different day →** button is always visible at the bottom. Tapping it opens a 4-step flow that stays within the kiosk — no redirects:

1. **Choose a Barber** — select a specific barber or "No preference" to see all available times
2. **Choose a Date** — up to 14 days ahead, listed as Today, Tomorrow, Monday, etc.
3. **Available Times** — the slot grid for the chosen date and barber
4. **Confirmation** — same green success screen, shows date and time

The booking inserts into your calendar with the same `source: walk_in` tag as a same-day walk-in, so it shows the WALK-IN badge in the admin calendar view.
