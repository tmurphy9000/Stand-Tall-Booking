---
title: Searching & Filtering Your Client List
description: How to find a client by name, email, or phone, what the client list shows at a glance, and how to export your full client list to CSV.
order: 4
---

The **Clients** page lists every client record for your shop. It loads 20 clients at a time, sorted alphabetically by name, and fetches more automatically as you scroll to the bottom.

![Client list with search bar and client rows](/help-assets/screenshots/clients/client-list.png)

## Searching

The search bar at the top filters the list as you type. The search is case-insensitive and matches partial strings:

- **Owners and managers** can search by name, email address, or phone number.
- **Barbers** (and roles without client management access) can search by name only — email and phone are not visible to them.

There are no separate filter controls. Search is the only way to narrow the list beyond the default alphabetical view.

## What each row shows

Each client row in the list displays:

- **Name** and profile photo (or placeholder initials icon)
- **Email and phone** (visible to managers; hidden from barbers)
- **Total Visits** — the total number of completed or non-cancelled appointments
- **Total Spent** — cumulative spend across all bookings
- **Star rating** — average review rating if the client has left any reviews
- **Deposit Req. badge** — an orange badge if the client has been flagged to always require a deposit

Clicking any row opens that client's full profile.

## Sorting

The client list is always sorted alphabetically by name. There are no sort controls to change the order by visits, spend, or last appointment date.

## Exporting your client list

Managers can download the full client list as a CSV by clicking **Export** on the Clients page. The file includes all clients (not just the visible page) with columns:

`name`, `email`, `phone`, `total_visits`, `total_spent`, `last_visit`, `staff_notes`

The file is named `clients-export-YYYY-MM-DD.csv` with today's date. This export can also be edited and re-imported to update bulk data such as staff notes.

## Downloading the import template

The **Template** button (next to Import and Export) downloads a blank CSV with the correct column headers and one example row. Use it as a starting point if you're manually building a client list to import.
