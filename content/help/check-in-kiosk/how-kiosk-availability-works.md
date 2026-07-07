---
title: How Kiosk Availability Works
description: Why certain barbers or times don't show up as available on the kiosk — working hours, blocked bookings, minimum notice, and how the slot logic works.
order: 4
---

If a client says "it wouldn't let me book at 3 PM" or "I didn't see any available times," the kiosk's availability logic is why. The kiosk applies the same real-world constraints as your online booking page — it doesn't show slots that can't realistically be honored.

## What the kiosk checks before showing a slot

For each potential time slot, the kiosk runs through these checks in order. A slot is only shown if it passes all of them:

### 1. Barber has configured working hours

The barber must have a start and end time set for today's day of the week in their schedule. If a barber's hours for Tuesday aren't configured (or are set to "off"), no slots are generated for them at all — there's no fallback default. This prevents phantom availability for barbers who haven't been set up.

### 2. Barber is online-bookable

Barbers flagged as **not online-bookable** or with **bookings blocked** are excluded from the walk-in slot pool entirely. These flags are set per barber in your barber management settings. Use them for barbers who handle internal appointments only or are temporarily unavailable for new bookings.

### 3. Barber is not on approved time off

If a barber has an approved time-off request covering today, they're skipped. No slots are generated for them for that date.

### 4. Slot is past the minimum booking notice

If you have a **minimum booking notice** set (e.g., 30 minutes), slots that start less than 30 minutes from the current time are excluded. This prevents a client from booking a slot that's about to start before you have time to prepare.

The cutoff is calculated dynamically — if it's currently 2:15 PM and your minimum notice is 30 minutes, slots at or before 2:45 PM are excluded. For the "Book for a different day" flow on future dates, the cutoff only applies on today's date; all slots on future dates are shown regardless of time.

### 5. Service fits before the barber's closing time

If a slot would require the service to run past the barber's end time, it's excluded. For example, if a barber works until 6:00 PM and a Haircut takes 45 minutes, the last available slot shown is 5:15 PM — not 5:30 or 5:45, because the appointment wouldn't finish in time.

### 6. Slot isn't already taken

If another booking (in any non-cancelled status) overlaps with the proposed slot, it's excluded. The overlap check accounts for the service duration, so a 45-minute haircut starting at 2:00 PM would block a 2:15 PM slot even if 2:15 isn't directly booked.

## Common reasons a client sees no slots

| What the client sees | Likely cause |
|---|---|
| No barbers shown at all | All barbers have bookings blocked, or none have online booking enabled |
| "No available slots today" | The shop is at capacity, the barbers' working hours have ended, or minimum notice excludes remaining slots |
| A specific barber doesn't appear | That barber's hours aren't configured for today, they're on time off, or they're not online-bookable |
| Gaps in the time slot list | Existing bookings are filling those windows |

## Minimum booking notice setting

Minimum booking notice is set in **Settings → General** under booking preferences. It applies equally to the kiosk walk-in flow and the online booking page. Setting it to 0 means clients can book a slot that starts immediately.

## How slots are generated

Slots are generated in 15-minute increments within the barber's working hours. If a barber works 9:00 AM–6:00 PM, potential slots run 9:00, 9:15, 9:30, … 5:45 PM (the last slot that fits a 15-minute service before 6:00 PM; longer services reduce the last available slot accordingly). All six filters above are applied to this list before anything is shown to the client.
