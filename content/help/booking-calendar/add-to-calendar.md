---
title: Clients Can Add Appointments to Their Calendar
description: After booking, clients see two buttons on the confirmation screen to save their appointment directly to Google Calendar or Apple Calendar.
order: 7
---

After a client completes a booking, the confirmation screen shows two buttons — **Add to Google Calendar** and **Add to Apple Calendar** — so they can save the appointment to their personal calendar without any extra steps.

![Booking confirmation screen with Add to Google Calendar and Add to Apple Calendar buttons](/help-assets/screenshots/booking/add-to-calendar.png)

## How it works

**Add to Google Calendar** opens Google Calendar in a new browser tab with the event already filled in — no typing required. The client clicks **Save** in Google Calendar and the appointment appears on their calendar.

**Add to Apple Calendar** downloads a standard `.ics` file named `appointment.ics`. Opening it adds the event to Apple Calendar. The `.ics` format is also compatible with Outlook, Google Calendar (via file import), and any other calendar app that supports the iCal standard.

## What's included in the calendar event

Each calendar event is pre-filled with:

| Field | Value |
|---|---|
| **Title** | Service name + barber name (e.g. *Haircut with Devon Williams*) |
| **Start time** | The exact time the client booked |
| **End time** | Start time + service duration |
| **Location** | Your shop's address (if set in Settings → Shop Info) |
| **Description** | *Booked via Stand Tall Barbershop* |

## Where clients see these buttons

The calendar buttons appear on the **booking confirmation screen** — the final "You're booked!" page a client sees after their booking is submitted. They are only shown once, on that screen. There is no separate link or email button.

If a client closes the confirmation page before saving the event, they can still add it manually by entering the appointment details in their calendar app.

## This is client-facing only

The calendar export is for clients to track their own appointments. It's not a barber schedule feed, and it doesn't connect to the shop's calendar. Barbers manage their schedule inside the Stand Tall Booking app on the Calendar page.
