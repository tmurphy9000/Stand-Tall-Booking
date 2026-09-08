---
title: Automated Campaigns
description: How to set up win-back, review request, and birthday automations that send emails to the right clients on a daily schedule without manual intervention.
order: 2
---

Automated campaigns run on a daily schedule and send emails to clients who meet a specific condition — without you having to remember. You configure them once and they run in the background. There are three automations available: **Review Request**, **Win-Back**, and **Birthday**.

Go to **Marketing** in the sidebar, then open the **Settings** tab.

![Marketing automations showing Review Request, Win-Back, and Birthday toggles](/help-assets/screenshots/marketing/marketing-automations.png)

## How automations run

Each automation checks your client list once a day at **10 AM Eastern** and sends emails to any clients who meet the trigger condition that day. Each has a safeguard to prevent the same client from receiving the same automated email more than once (or more than once per year for birthday emails).

Use the **Run now** button next to any automation to trigger it immediately — useful for testing or catching up after first enabling it.

## Review Request

**Trigger:** A client completes their Nth visit (you set the number).

**Behavior:** Fires once per client, ever. Once a client has received a review request, they won't receive another one regardless of how many more visits they make.

**To enable:**
1. Toggle **Review Request** on.
2. Set the number of completed visits that triggers the email (for example, 3).
3. Enable **Google Reviews** and/or **Yelp Reviews**, then paste in the link to your review page for each platform.
4. Click **Save settings**.

The email asks the client to leave a review and includes the link(s) you provided.

## Win-Back

**Trigger:** A client's most recent completed visit was exactly N days ago (you set N).

**Behavior:** Runs daily, so each day it reaches clients who hit that threshold that day. A client is skipped if they received a win-back email within the last 30 days.

**To enable:**
1. Toggle **Win-Back** on.
2. Set the number of days since last visit.
3. Optionally choose a custom email template (the built-in win-back template is used by default).
4. Optionally select a promo code to include — if you do, make sure your template includes a spot for the discount code. See [Creating & Managing Promo Codes](/help/marketing/creating-managing-promo-codes) for how to create codes.
5. Click **Save settings**.

> A 60-day win-back threshold is a common starting point. Long-time clients are more likely to respond to a personal message than a quick promo.

## Birthday

**Trigger:** A client's birthday is today.

**Behavior:** Runs daily, fires once per client per calendar year. Clients without a recorded birthday are skipped.

**To enable:**
1. Toggle **Birthday** on.
2. Optionally select a custom email template (the built-in "Happy Birthday" template is used by default).
3. Click **Save settings**.

Client birthdays are set on individual client profiles in the **Clients** section. See [Understanding Client Profiles](/help/clients-crm/understanding-client-profiles).

## Templates

By default each automation uses a built-in template appropriate for that type. If you've created custom campaigns and saved them as templates, they'll appear in the template dropdown for win-back and birthday automations.

## Turning automations off

Toggle any automation off and click **Save settings**. The automation stops running immediately — no emails go out until you turn it back on.
