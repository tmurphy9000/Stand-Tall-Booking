---
title: Booking Outside Normal Hours
description: How the outside-hours override works — the warning dialog and the two ways to trigger it.
order: 3
---

Stand Tall Booking lets admins and owners book appointments outside a barber's normal working hours. This is intentional — a barber might agree to come in early for a specific client, or you might need to add a late appointment. The app shows a warning but lets you proceed.

Outside-hours slots are never available to clients booking online — this override is admin-only.

## Two ways to trigger an outside-hours booking

### Path 1: From the New Booking modal time picker

1. Open the **New Booking** modal (click **+ Book** or click an empty slot → **Regular Appointment**)
2. Select a barber and date
3. In the time slot grid, outside-hours slots appear with a **dashed border and reduced opacity**
4. Click any dashed slot
5. A warning dialog appears: **"Outside Working Hours"** — "This time is outside [barber's] normal working hours. Are you sure you want to book outside their scheduled hours?"
6. Click **Book Anyway** to confirm that exact time — the slot is now selected and shown in the form
7. Fill in the rest of the booking details and click **Create Booking**

### Path 2: Clicking directly on a greyed-out slot on the calendar grid

1. On the calendar, greyed-out cells represent times outside the barber's working hours
2. Click directly on one of those cells
3. The **New Booking** modal opens, pre-filled with the barber, date, and the exact time you clicked
4. The Time section shows an **amber chip** with the selected time and the note "Outside working hours — confirm below" — the time is locked in and won't change
5. Fill in client and service details
6. Click **Create Booking**
7. The **"Outside Working Hours"** warning dialog appears
8. Click **Book Anyway** — the booking is saved at the exact time you clicked

## What the warning dialog looks like

The dialog title shows a yellow triangle icon next to **"Outside Working Hours"**. The body names the specific barber:

> *"This time is outside [Barber Name]'s normal working hours. Are you sure you want to book outside their scheduled hours?"*

Two buttons:
- **Cancel** — dismisses the dialog without saving. In Path 1 this leaves the time unselected; in Path 2 the modal stays open so you can change something.
- **Book Anyway** — confirms the booking at the outside-hours time.

## Why the time is "locked" in Path 2

When you click a greyed-out cell directly on the grid, the app stores that exact time separately from the regular time picker — so the normal slot logic (which would default to the nearest in-hours slot) can't override it. The amber chip is the visual signal that this time came from a direct grid click and is locked until you confirm.

![Outside-hours warning dialog](/help-assets/screenshots/calendar/outside-hours-warning.png)
