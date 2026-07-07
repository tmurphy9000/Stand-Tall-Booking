---
title: Adding & Editing Clients Manually
description: How client records are created when you make a booking, what you can edit on a client's profile, and how duplicate detection works.
order: 3
---

There is no standalone "Add Client" button in Stand Tall Booking. Client records are created automatically when you book an appointment for someone who isn't already in the system. This keeps the client list clean — every record is tied to at least one booking.

## How a new client record is created

When you create a booking from the Calendar using the **New Booking** modal:

1. Start typing the client's name in the **Client Name** field. If they already exist, their name appears in a dropdown — select it to auto-fill their phone and email.
2. If no match appears, continue typing their name and fill in their **phone number** and/or **email address**.
3. When you save the booking, Stand Tall Booking checks whether the phone or email matches an existing client:
   - **No match found**: a new client record is created automatically with the name, email, and phone you entered.
   - **Match found**: a merge dialog appears, giving you the option to link this booking to the existing record instead of creating a duplicate. Linking preserves the existing client's full booking history.

A client record is only created if at least one contact field (phone or email) is provided alongside the name. Name-only bookings (e.g. walk-ins or call-ins) do not create a permanent client record.

## What you can edit from the client profile

Open the **Clients** page and click a client's row to open their profile. From there, owners and managers can change:

- **Deposit Required** — toggle on to always require a deposit from this client, regardless of your shop's general deposit settings
- **SMS Reminders** — toggle the client's SMS opt-in status on or off; the change is logged with the staff member's name and timestamp
- **Birthday** — set or change the date; used to trigger automated birthday emails

The client's **name, email, and phone** are not directly editable from the profile page. To correct a name or contact detail, create a new booking for that client and update the fields in the booking form — if the phone or email matches the existing record, you'll be offered a merge that updates the stored contact info.

**Staff notes** are displayed read-only on the profile when present. To set or update staff notes, use the CSV import workflow: export your client list, add or edit the **Staff Notes** column in the exported file, and re-import it.

## Barber-level access

Staff members without client management access can view the client list and click profiles, but cannot see email addresses or phone numbers, cannot toggle the deposit or SMS settings, and cannot access the birthday field. Their view of the client list is name-only.
