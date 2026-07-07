---
title: Viewing & Managing Transactions
description: What the Transactions page shows, how to filter by date or payment type, how to export a report, and how to print a transaction summary.
order: 3
---

The **Transactions** page is the record of every completed and refunded checkout at your shop. Open it from the sidebar.

![Transactions page showing summary tiles, date filter, and transaction table](/help-assets/screenshots/checkout/transactions.png)

## Summary tiles

Four tiles appear at the top:

| Tile | What it shows |
|---|---|
| **Cash on Hand** | Your all-time net cash balance across all cash drawer activity (not scoped to the selected date range) |
| **Cash** | Total revenue collected in cash for the selected date range |
| **Card** | Total revenue collected by card for the selected date range |
| **Total Revenue** | All completed checkouts combined for the selected date range |

## Filtering by date

Three quick-select buttons — **Today**, **This Week**, **This Month** — adjust both summary tiles and the transaction table at once. For a custom range, use the **From** and **To** date pickers.

## Filtering by type

Two toggle buttons let you narrow the table to a subset:

- **Refunded Transactions** — shows only transactions that have been refunded. A badge in the table header shows how many refunds and the total amount refunded.
- **Cash Transactions** — shows only cash payments. Useful for reconciling your drawer at end of day.

The two filters stack: enabling both shows cash refunds only.

## Transaction table

Each row in the table shows one completed checkout:

| Column | What's in it |
|---|---|
| **ID** | A short reference code for this transaction |
| **Date / Time** | When the checkout was completed |
| **Client** | Client name, or "Walk-in" if no name was entered |
| **Service** | Service name |
| **Product** | Retail product sold, if any |
| **Barber** | Staff member who performed the service |
| **Method** | Cash, Card, Reader, or Other badge |
| **Svc $** | Service revenue before tip and discount |
| **Pdt $** | Product revenue |
| **Tax** | Tax collected |
| **Tip** | Tip amount |
| **Disc** | Discount applied |
| **Total** | Final amount collected |
| **Status** | Completed (green) or Refunded (red) |

A totals row at the bottom of the table sums each column across all displayed rows.

## Refunding a transaction

Card transactions processed through Stripe show a **Refund** button on the right side of the row. See [Processing Refunds](/help/checkout-payments/processing-refunds) for the full flow.

Cash transactions do not have a Refund button — cash refunds are handled outside the app.

## Exporting

**Export** downloads the current filtered view as a CSV file named `transactions-[start]-to-[end].csv`. The file includes every visible row plus the totals row. Use it for accounting, tax filing, or importing into a spreadsheet.

**Print** opens a formatted print view of the same table optimized for landscape printing.

## Cash Drawer Log

Below the transaction table is the **Cash Drawer Log** — a record of all manual cash entries and withdrawals. See [The Cash Drawer Log](/help/checkout-payments/cash-drawer-log) for details.
