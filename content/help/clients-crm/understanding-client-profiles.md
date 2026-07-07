---
title: Understanding Client Profiles
description: What's tracked on each client's profile — visit history, spend, no-shows, SMS opt-in, deposit flag, birthday, and staff notes.
order: 1
---

Every client in Stand Tall Booking has a profile page that aggregates their history and lets you manage per-client settings. Open a profile by clicking any client row in the Clients list.

![Client profile showing stats, toggles, and booking history](/help-assets/screenshots/clients/client-profile.png)

## Header

The top of the profile shows the client's name, email address, and phone number. Email and phone each have a one-click copy button. If the client has a profile photo (set via the booking portal), it appears as a circular avatar; otherwise a placeholder icon is shown.

## Stats tiles

Four tiles appear at the top of the profile:

| Tile | What it tracks |
|---|---|
| **Total Visits** | Count of all bookings in any non-cancelled status |
| **Total Spent** | Sum of `final_price` (or `price` if not set) across completed bookings |
| **No Shows** | Count of bookings marked no-show |
| **Late** | Count of bookings marked late |

No Shows is displayed in orange and Late in amber to make them visually distinct from positive stats.

## Deposit Required

Owners and managers see a **Deposit Required** toggle. When enabled, this client will always be required to pay a deposit before a booking is confirmed — regardless of your shop's general deposit settings. The client list also shows a small **Deposit Req.** badge on their row as a reminder when booking.

## SMS Reminders

The **SMS Reminders** toggle reflects whether the client has opted in to automated appointment reminder texts. It can be toggled manually by staff at any time. The profile shows who last changed the opt-in status and the date and time of that change, so there's a clear audit trail if a client disputes whether they agreed to receive texts.

## Birthday

Owners and managers can set a client's birthday using the date field on the profile. The birthday is used to trigger automated birthday emails — it doesn't affect booking availability or any other feature.

## Staff Notes

If a client record has a `staff_notes` value, it appears as a read-only block on the profile under the label **Staff Notes**. This field is populated via the CSV import (see [Importing Your Client List](/help/clients-crm/importing-your-client-list)) or the CSV export/re-import workflow; there is no in-app text editor for it on the profile page. If staff_notes is empty, the section is hidden entirely.

## Booking History

Below the settings cards is the full booking history for that client. Each entry shows:

- **Service name**
- **Barber name and date/time**
- **Price paid** (`final_price` if set, otherwise `price`)
- **Status badge** — completed (green), cancelled (red), no_show (orange), or the raw status for anything else

Bookings are listed most-recent-first. This history is read-only on the profile page; individual bookings can be managed from the Calendar.
