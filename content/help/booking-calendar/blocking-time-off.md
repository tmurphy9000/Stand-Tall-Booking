---
title: Blocking Time Off
description: How to use the Block Time modal to hold calendar slots, with repeat and indefinite options.
order: 5
---

A "block" reserves a time slot on a barber's calendar without it being a client appointment. Use it for lunch breaks, equipment maintenance, a training session, or anything that takes a barber off the floor temporarily.

Blocked time appears on the calendar as a dark card labeled **BLOCKED TIME** and prevents that slot from being booked by clients online.

## Opening the Block Time modal

1. Click on any empty time slot in the calendar grid
2. From the pop-up menu, choose **🚫 Block Time**
3. The **Block Time** modal opens, pre-filled with the barber and time you clicked

You can also adjust the barber and time inside the modal.

## Modal fields

**Barber** — select which barber's calendar to block. Only active barbers appear.

**Date** — the date to block. Defaults to the date of the slot you clicked.

**Quick Buttons** — choose a preset duration: **15 min / 30 min / 45 min / 1 hour**. Selecting one sets the end time automatically based on the start time.

**Start Time / End Time** — fine-tune the exact times. Changing the end time manually deactivates the quick preset. Time inputs step in 15-minute increments.

**Reason** — optional note (max 80 characters) shown on the block card. If left empty, the card reads "Blocked." Examples: *Lunch*, *Personal appointment*, *Out sick*.

## Repeating a block

Toggle **Repeat this block** on to schedule the block on a recurring basis. Three options appear:

**Pattern:**
- **Daily** — blocks every day in the range
- **Weekly (same day)** — blocks the same day of the week each week
- **Specific days of week** — pick which days (Su Mo Tu We Th Fr Sa) using the day chips; blocks every selected weekday in the range

**End condition** — three buttons control when the repeat stops:

| Option | Behavior |
|---|---|
| **End by date** | Repeats until the date you choose |
| **# of times** | Repeats exactly N times (enter a number) |
| **Indefinite** | Generates a 1-year rolling window of blocks |

Before saving, the modal shows a preview: *"Will create N blocks through [date]."*

## The "Indefinite" option

**Indefinite** creates blocks up to one year from the start date — that's up to 366 individual block records for a daily pattern. When you need to stop an indefinite series, right-click any block in that series and choose **Delete All Recurring Blocks**.

> Indefinite blocks renew automatically as long as you don't delete the series. To stop them in the future, you'll need to delete the series or delete individual upcoming blocks.

## Saving the block

Click **Block Time** (or **Block N Slots** when repeating). The block(s) appear on the calendar immediately.

## Deleting a block

Right-click the blocked time card on the calendar. For a one-off block, choose **Delete Block**. For a recurring block, you'll see:

- **Delete All Recurring Blocks** — removes every block in the series
- **Delete Just This Block** — removes only this single occurrence, leaving the rest of the series intact
- **Keep Block** — closes the dialog without deleting

![Block Time modal](/help-assets/screenshots/calendar/block-time-modal.png)
