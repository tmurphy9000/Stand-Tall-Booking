---
title: Tips & Commissions
description: How service and product commission rates are set per barber, how tips are attributed, and where these numbers appear in payroll.
order: 2
---

Stand Tall Booking tracks earnings separately for each barber based on two commission rates — one for services, one for retail products — plus any tips collected at checkout.

## Setting commission rates

Commission rates are set per barber in **Settings → Team**. Click a barber's card to edit, and scroll to **Commission Rates**:

- **Service Commission %** — the percentage of service revenue that goes to the barber. Default is 50%.
- **Product Commission %** — the percentage of retail product revenue that goes to the barber. Default is 10%.

Each barber can have a different rate. Rates take effect immediately for any payroll report generated after saving them — they do not retroactively change past reports.

## How earnings are calculated

When you run a payroll report for a date range:

| Earnings type | How it's calculated |
|---|---|
| **Service commission** | Total service revenue for that barber × their service commission rate |
| **Product commission** | Total product revenue for that barber × their product commission rate |
| **Tips** | Added in full — tips are not split or percentage-reduced |
| **Total earnings** | Service commission + Product commission + Tips |

For example: a barber with a 60% service rate who did $800 in services, $100 in retail, and received $75 in tips earns $480 in service commission + $10 in product commission + $75 in tips = **$565 total**.

## How tips are attributed

Tips are attributed to the barber assigned to the service item on the checkout. If a checkout has multiple service items for different barbers, the tip is attached to the primary barber on the transaction rather than split across all of them.

Tips entered at checkout (from the calendar Checkout modal or Quick Checkout page) appear in the tip column on the Transactions page and roll into the payroll report automatically.

## Where to see the breakdown

- **Payroll** (sidebar) — shows the full earnings breakdown per barber for any date range, including each component separately
- **Transactions** page — shows tip and total columns per transaction
- **Personal Report** — each barber can see their own earnings; owners and managers can see all barbers

## Changing rates mid-cycle

If you adjust a barber's commission rate partway through a pay period, the new rate applies from the moment you save it. Transactions already recorded before the change are unaffected in the payroll calculation, so you may want to run reports for the before-change and after-change windows separately.
