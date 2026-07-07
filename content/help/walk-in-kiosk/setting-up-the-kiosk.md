---
title: Setting Up the Check-In Kiosk
description: How to enable the check-in kiosk in Settings, generate your kiosk link, and set up walk-in booking for clients without appointments.
order: 1
---

The check-in kiosk is a dedicated tablet-friendly screen that lives at a unique URL — no login required. Clients use it to tap their name and check in when they arrive, or to book a walk-in spot on the spot. You set it up once from Settings, then point a tablet at the URL and leave it running.

## Who can set this up

The Kiosk settings tab is visible to **owners, managers, and superadmins**. Barbers and other access levels do not see this tab.

## Getting to the Kiosk settings

Go to **Settings → Kiosk** in your admin dashboard.

![Kiosk settings in the Settings panel](/help-assets/screenshots/kiosk/settings-kiosk.png)

## Generating your kiosk link

If no kiosk link exists yet, you'll see a **Generate Kiosk Link** button. Click it once. A unique URL is created for your shop — it looks like:

```
standtallbooking.com/checkin/a1b2c3d4e5f6...
```

The long string at the end is a random token that controls access. The URL works on any browser without any login — access is controlled purely by knowing the token.

## Opening the kiosk

Once the URL is generated, use the **Copy** button to copy it, or click **Open Kiosk** to preview it in a new tab. On the kiosk device itself, paste or type the URL into the browser and leave it open. No login is needed on the device.

## Enabling walk-in booking

Below the URL section is an **Enable walk-in booking** toggle. When turned on, a **Walk In** button appears on the kiosk landing screen alongside the standard **Check In** button. Clients without appointments can tap Walk In to book a slot on the spot.

When the toggle is off, only the Check In flow is visible — clients can still check in for existing appointments, but walk-in booking is hidden.

## Regenerating the link

If you suspect the link was shared with someone it shouldn't have been, click **Regenerate link** (shown as a small refresh icon below the URL). A warning explains that the old link will stop working immediately — any device still pointing at the old URL will show an error. After confirming, update the URL on your kiosk device.

## Recommended hardware

Any tablet or touchscreen in a modern browser works. Leave the page open full-screen and make sure the device won't go to sleep mid-day. There's no app to install — the kiosk is just a web page.
