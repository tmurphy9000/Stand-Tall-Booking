---
title: Creating a New Booking
description: How to open the New Booking modal, fill in client and service details, and pick a time slot.
order: 2
---

New bookings can be created from the calendar in two ways:

- Click the **+ Book** button in the calendar header (top right)
- Click on any **empty time slot** in the calendar grid, then choose **Regular Appointment** from the pop-up menu

Both open the **New Booking** modal.

## Filling in the booking

### Client

Start typing in the **Client Name** field. If the client exists in your system, they'll appear in a dropdown — click their name to auto-fill their phone and email. If they're new, type their full name and fill in contact details manually.

The name field auto-capitalizes the first letter of each word. Names like "john doe" become "John Doe" as you type.

> **Duplicate detection:** If you enter a phone number or email that matches an existing client, you'll see a "Duplicate Account Detected" dialog before the booking saves. You can either **Merge Accounts** (link the booking to the existing client record) or proceed as a new client.

### Barber

Select the barber from the **Barber** dropdown. Barbers currently on approved time off appear with **(On time off)** next to their name and can't be selected.

### Service

Select the service. The dropdown shows each service's name, price, and duration. If a barber has a **custom duration or price** set for that service (configured under Settings → Barbers → Services), the custom value is shown and tagged with a small indicator.

### Date

The date defaults to today. Change it with the date field. Changing the date clears the selected time slot (since availability changes day to day).

### Time

Once a barber and date are selected, a **time slot grid** appears showing 15-minute intervals from **6:00 AM to 10:00 PM**:

| Slot appearance | Meaning |
|---|---|
| White/card background | Available — click to select |
| Green with white text | Currently selected |
| Grey, struck-through | Taken (another booking overlaps) |
| Dashed border, faded | Outside the barber's working hours — clickable, triggers a warning |

Scroll the grid to see earlier or later times. The grid accounts for the **minimum booking notice** setting — slots too close to the current time appear as taken.

### Summary and total

After selecting a service and time, a summary panel shows the service duration, price, calculated end time, and the total charge. This is for reference — payment is handled at checkout, not during booking.

### Notes

Add any special instructions in the **Notes** field. These are internal only — clients don't see them.

## Saving the booking

Click **Create Booking**. The booking appears on the calendar immediately. If the client was new and you provided their email or phone, a client record is created automatically.

![New booking modal](/help-assets/screenshots/calendar/new-booking-modal.png)
