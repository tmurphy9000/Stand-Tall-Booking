---
title: Creating & Managing Promo Codes
description: How to create a redeemable discount code, set a percentage or fixed-amount discount, limit usage or set an expiry, and track how many times a code has been used.
order: 4
---

Promo codes give clients a discount at checkout — either a percentage off or a fixed dollar amount. You create and manage them from the **Promo Codes** tab under **Marketing**. Codes you create here can also be attached to email campaigns so they appear in the email body as a styled coupon.

Go to **Marketing** in the sidebar, then open the **Promo Codes** tab.

## Creating a code

Click **Create Code** to open the creation form.

![Promo code creation form showing code, type, discount value, max uses, and expiry fields](/help-assets/screenshots/marketing/promo-code-form.png)

Fill in the fields:

**Code** — the text string clients will enter. Can contain letters, numbers, hyphens, and underscores. The code is automatically uppercased (so `summer20` and `SUMMER20` are treated the same). Keep it easy to type and remember.

**Type** — choose between:
- **Percentage** — takes a percentage off the service price (e.g., 20% off)
- **Fixed amount** — takes a flat dollar amount off (e.g., $10 off)

**Discount value** — enter the percentage or dollar amount. Percentages cannot exceed 100.

**Max uses** *(optional)* — the maximum number of times the code can be redeemed across all clients. Leave blank for unlimited uses.

**Expires** *(optional)* — a date after which the code is no longer valid. Leave blank if the code should not expire.

Click **Create code** to save. The code becomes active immediately and appears in your promo code list.

## The promo code list

Each code in the list shows:

- The code itself, in monospace bold
- A badge showing the discount (e.g., "20% off" or "$10.00 off")
- An expiry date, if set — shown in red if the code has already expired
- A use counter showing how many times it's been redeemed (and the max, if you set one)
- An **Active / Off** toggle
- An edit button and a delete button

## Activating and deactivating codes

The toggle on each code turns it on or off without deleting it. Clients who try to use an inactive code at checkout will see an error. This is useful for seasonal codes you want to reuse — turn it off after the promotion ends, then turn it back on next time.

## Editing a code

Click the edit button (the document icon) on any code to reopen the form with that code's current settings. You can change the discount value, max uses, expiry date, and type — but not the code text itself (to change the text, delete the code and create a new one).

## Deleting a code

Click the delete button (the X icon) on the code row. A confirmation prompt appears before anything is deleted. Deleting a code is permanent — the use history is removed along with it.

## Using a code in a campaign

When building a campaign in the **Campaigns** tab, the campaign editor includes a promo code picker in the toolbar above the body field. Select a code there and then insert it into the body. The code renders as a styled coupon block in the sent email. See [Sending Email Campaigns](/help/marketing/sending-email-campaigns) for details.

## How clients redeem codes

Clients can enter a promo code on your public booking page during checkout. The discount is applied automatically to the service price. Cash and card payments are both eligible — the discount is deducted from the total before any deposit is calculated.
