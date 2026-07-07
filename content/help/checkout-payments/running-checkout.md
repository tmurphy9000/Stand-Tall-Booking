---
title: Running Checkout
description: How to process payment for a completed appointment or walk-in — adding items, applying discounts and promo codes, collecting tips, and choosing a payment method.
order: 1
---

There are two ways to check someone out in Stand Tall Booking. The **Checkout modal** opens directly from a completed appointment on the calendar. The **Quick Checkout** page (accessible from your sidebar) handles cash sales, retail purchases, and walk-ins that don't have a prior appointment.

![Quick Checkout screen showing items, discount, tip, and payment method fields](/help-assets/screenshots/checkout/checkout.png)

## Checkout from the calendar

Right-click any appointment on the calendar and choose **Checkout**, or click the appointment to open its detail panel and tap the **Checkout** button. The client's name, service, barber, and price pre-fill automatically.

## Quick Checkout

Navigate to **Quick Checkout** from the sidebar. This version starts with a blank slate — there is no pre-existing appointment. Type the client's name (optional — the field autocompletes from your client list), then add items manually.

## Adding items

Each checkout can include any combination of services and retail products:

- **Add Service** — select from your service menu. Each service item requires a barber to be assigned before you can complete the checkout.
- **Add Product** — select a retail product from your inventory. Product sales reduce your stock count automatically.

In the calendar Checkout modal, you can also add other appointments from the same day using the **Add Appointment** picker. This lets you bundle multiple services for the same client — or different clients seen by the same barber — into one transaction.

## Discounts

### Quick Discounts (preset buttons)
If you've set up named discounts in **Settings → Discounts**, they appear as buttons above the discount fields. Tap one to apply it instantly.

### Manual discount
Select **Percentage** or **Fixed Amount** from the Discount Type dropdown, then enter the value. A percentage discount reduces the subtotal by that share; a fixed discount subtracts a set dollar amount.

### Promo codes
Type a code into the Promo Code field and click **Apply**. If the code is valid and not expired, a green banner shows the code and the discount amount. Click the × to remove it and try a different code.

Promo codes created online during the client's booking are pre-filled automatically when you open that booking's checkout.

## Tip

Tip presets appear as buttons: **No Tip**, **10%**, **15%**, **20%**, **25%**, **30%**, and **Custom $**. Percentage presets calculate against the subtotal after discounts and update the dollar amount shown on each button as you change the order. Tap **Custom $** to enter any dollar amount.

## Payment method

Choose how the client is paying:

| Option | When it appears |
|---|---|
| **Cash** | Always available |
| **Manual Card Entry** | Requires a connected Stripe account |
| **Card Reader (Terminal)** | Requires Stripe + a registered card reader |
| **Other** | Always available — for Venmo, Zelle, or any payment handled outside the app |

When you select **Card (manual entry)**, a card input field appears. Enter the card number, expiration date, and security code. When you select **Card Reader**, the checkout waits for the client to tap or insert their card on the physical reader.

## Order summary

The summary panel at the bottom shows:

- **Subtotal** — sum of all services and products
- **Tax** — applied to taxable products only, at the rate set per product
- **Discount** — manual or preset discount deducted
- **Promo** — code discount deducted (if applied)
- **Tip** — added to the total
- **Deposit collected** — if the client paid a deposit at booking, it's shown here and subtracted from what's owed now
- **Total** — the amount to collect

## Completing the checkout

Click **Complete Checkout** (or **Charge $X.XX** for card payments). A success message appears and you're returned to the calendar. The transaction is recorded on the **Transactions** page immediately.

If every item doesn't have a barber assigned, the button stays disabled until all items are assigned.
