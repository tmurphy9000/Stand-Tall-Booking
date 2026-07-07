---
title: Importing Your Client List
description: How to import clients from Vagaro, Square, Booksy, GlossGenius, and other platforms using the AI-powered file import.
order: 2
---

If you're moving to Stand Tall Booking from another platform, you don't need to re-enter every client by hand. The import tool accepts an export file from your previous software and extracts client records automatically.

![Import Clients dialog showing file upload area](/help-assets/screenshots/clients/import-dialog.png)

## Who can import

Only users with the **clients.management** permission (owners and managers by default) see the **Import** button on the Clients page. Barbers with standard access cannot import.

## Supported platforms and file formats

The import accepts CSV, Excel (.xlsx), and PDF exports from:

**Vagaro, Square, Booksy, GlossGenius, Fresha, Squire, StyleSeat, Mindbody, DaySmart, Boulevard**

It also accepts an export from Stand Tall Booking itself (see [Searching & Filtering Your Client List](/help/clients-crm/searching-filtering-clients) for how to export).

If your platform isn't listed, try exporting as a CSV — as long as the file has recognizable columns for name, email, and phone, the importer will typically extract them correctly.

## Downloading the template

If you want to build your client list from scratch in a spreadsheet rather than migrating from another platform, click **Template** on the Clients page. It downloads a CSV with the correct column headers:

`name`, `email`, `phone`, `total_visits`, `total_spent`, `last_visit`, `staff_notes`

Fill it in and import the resulting file the same way you would a platform export.

## Import process step by step

1. On the **Clients** page, click **Import**.
2. In the dialog that opens, click **Choose File** and select your export file (CSV, .xlsx, or PDF).
3. The file uploads immediately. Once uploaded, the AI processor begins extracting client records. A progress bar shows how much of the file has been processed and how many clients have been found so far.
4. Large files take a few minutes. You can leave the dialog open in the background — the import continues running even if you switch to another part of the app.
5. When complete, a success toast shows the total number of clients imported and the dialog closes.

## Resuming an interrupted import

If you close and reopen the Import dialog while a job is still running, it automatically reconnects to the existing job and continues from where it left off. You won't lose progress or import duplicates.

## What gets imported

Each client record is created with whatever the file contains. At minimum, a name is required. Email, phone, total visit count, total spend, last visit date, and staff notes are imported if the file includes them. Fields not present in the file are left blank and can be filled in later.

## If the import fails

An error message appears in the dialog with a description of what went wrong. Common causes are password-protected PDFs, files that don't contain any recognizable client data, or a network interruption during upload. After a failure, the dialog resets and you can try again with a different file or a re-exported version.
