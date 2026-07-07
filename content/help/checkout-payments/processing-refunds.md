---
title: Processing Refunds
description: How to issue a full or partial refund on a card payment from the Transactions page, and what happens to the transaction status afterward.
order: 4
---

Refunds in Stand Tall Booking go through Stripe and are initiated from the **Transactions** page. Only card payments processed through Stripe can be refunded this way — cash and "Other" payment transactions do not have the refund option.

## Finding the transaction to refund

1. Go to **Transactions** in the sidebar.
2. Locate the transaction using the date filter or the **Refunded Transactions** / **Cash Transactions** toggles. Card transactions that haven't been refunded yet show a small **Refund** button on the right side of the row.
3. Click **Refund** to open the refund dialog.

## The refund dialog

The dialog shows a summary of the original transaction:

- **Client** name
- **Service** performed
- **Original total** — the full amount charged

Below the summary is a **Refund amount** field pre-filled with the full amount. You can lower it to issue a partial refund. If you enter less than the original total, a note shows how much will be retained.

An optional **Reason** field lets you add a note (for example, "Client request" or "Service issue"). This reason is stored with the refund record.

## Issuing the refund

Click **Issue Refund**. The refund is processed through Stripe immediately. Once confirmed:

- The transaction row on the Transactions page shows a **Refunded** status badge (red).
- The original total is deducted from your summary tiles for that date range.
- A partial refund keeps the row marked as Refunded with the retained amount visible.

Stripe typically returns funds to the client's card within 5–10 business days, depending on their bank.

## Cash payment refunds

Cash payments don't have a Refund button. If you need to return cash to a client, handle it at the drawer and log the amount as a withdrawal in the Cash Drawer Log so your balance stays accurate. See [The Cash Drawer Log](/help/checkout-payments/cash-drawer-log).

## Refund window limit

Stripe allows refunds for up to 90 days after the original charge. Transactions older than that cannot be refunded through the app — contact Stripe support directly if you need to handle an older charge.
