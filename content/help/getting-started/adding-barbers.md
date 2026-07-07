---
title: Adding Barbers & Staff
description: How to add barbers to your shop, set their access level, manage their schedule, and invite them to log in.
order: 4
---

Every person who takes bookings needs a barber record in Stand Tall Booking. This controls their availability, their commission rates, and what they can see and do in the dashboard.

## Adding a new barber

1. Go to **Settings → Barbers**
2. Click the **Add** button in the top-right of the Barbers section
3. Fill in the barber's details:

| Field | Notes |
|---|---|
| **Name** | Required. Shown on the booking page and calendar. |
| **Email** | Used as their login. Must be unique. |
| **Phone** | Optional contact number. |
| **Service Commission %** | Their cut of each service. Default: **50%** |
| **Product Commission %** | Their cut of any retail product sales. Default: **10%** |
| **Access Level** | Controls what they can see in the app. See below. |
| **Employment Status** | Toggle between Active and Terminated. |
| **Photo** | Optional profile photo — PNG, JPG, or WebP, max 5 MB. |

4. Click **Add Barber** to save

## Inviting a barber to log in

Adding a barber record doesn't automatically give them a login — you need to send them credentials through the **Invite Barber** flow.

1. In Settings → Barbers, click **Invite Barber** (top of the section)
2. Fill in their first name, last name, email, phone, and **Temporary Password** — you'll share this password with them directly
3. Choose their **Access Level**
4. Choose how to collect payroll info:
   - **Share Manually** — creates the account and gives you the temp password to share with them; they'll be asked to change it on first login
   - **Enter Manually** — you enter their payroll details (SSN, bank info, driver's license) right now if you have them on hand
5. Click **Add Barber**

> The barber logs in at the same login page as you: **standtallbooking.com/barber-login**

## Access levels

Access levels control what each team member can see and do. You manage access levels under **Settings → Access Levels**. Common setups:

- **Owner** — full access to everything, including billing and reporting
- **Manager** — can edit bookings, clients, and settings, but not billing
- **Service Provider** — can see only their own calendar and check out clients; no settings access

## Per-barber settings

Each barber card in the Barbers list has three action buttons:

| Button | What it does |
|---|---|
| **Hours** | Opens the schedule editor for this barber — set which days they work and their start/end times |
| **Services** | Configure per-barber service durations (e.g. a senior barber may be faster or slower than the default) |
| **Edit** | Update their name, contact info, commission rates, photo, or employment status |

There's also an **Online** toggle on the right side of each card. When off, this barber won't appear on the public booking page for online self-booking, but they can still be booked manually from the admin calendar.

## Setting a barber's schedule

After adding a barber, set their working hours so availability shows correctly on the booking page:

1. Click **Hours** on their card
2. Toggle each day they work to **on**
3. Set their start and end time for each active day
4. Click **Save Hours**

See [Setting Shop Hours](/help/getting-started/shop-hours) for more on how shop hours and barber hours interact.

![Settings page with barber list](/help-assets/screenshots/settings/settings.png)
