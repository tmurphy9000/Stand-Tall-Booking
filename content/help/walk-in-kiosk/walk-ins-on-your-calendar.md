---
title: Walk-Ins on Your Calendar
description: How walk-in appointments appear in the admin calendar, what the WALK-IN badge means, and how check-in status is reflected.
order: 3
---

Walk-in bookings — whether booked same-day through the kiosk or scheduled ahead via "Book for a different day" — appear on your admin calendar alongside every other appointment. They're visually tagged so you can distinguish them at a glance.

## The WALK-IN badge

Any appointment created through the kiosk walk-in flow shows a small **WALK-IN** badge on the calendar tile, displayed in blue text on a light blue background. This badge appears next to the client name in the top-right corner of the appointment block, the same position where NEW and deposit badges appear.

![Calendar showing WALK-IN badge on an appointment](/help-assets/screenshots/kiosk/calendar-walk-in-badge.png)

The badge indicates the booking's `source` field is `walk_in` — set automatically when a client books through the kiosk. Appointments booked through your regular booking page, manually by staff, or via call-in do not show this badge.

## Check-in status

When a client taps **Confirm Check-In** on the kiosk, the appointment status changes to `checked_in` and an **Arrived** indicator (a green dot next to the word "Arrived") appears on the calendar tile. This happens in real time — the calendar refreshes and reflects the new status without needing a page reload.

A checked-in appointment tile is also displayed with a green tint in the appointments list on the kiosk itself, with "Already checked in" shown and the button disabled so the client can't accidentally check in twice.

## Finding walk-in appointments

Walk-in appointments follow the same filtering and sorting as all other bookings. In **day view**, they appear in the barber's time column at the booked time. In **week view**, they appear on the scheduled date. You can click any walk-in appointment to open its detail panel — the same panel used for regular bookings — to view client info, mark it as arrived, or update the status.

## Same-day vs. future walk-ins

- **Same-day walk-in** (booked at the kiosk for today): appears immediately on today's calendar
- **Future walk-in** (booked via "Book for a different day"): appears on the scheduled date's calendar view, just like an online booking
