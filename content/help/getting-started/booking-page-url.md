---
title: Your Public Booking Page URL
description: How to find, customize, share, and embed your shop's public booking link.
order: 7
---

Every shop on Stand Tall Booking gets a unique public booking page that clients can use to self-book 24/7. The URL format is:

```
standtallbooking.com/book/your-shop-slug
```

This page is always live. No setup required to activate it — as long as you have at least one barber with hours set and at least one service, clients can book through it.

## Finding your booking URL

1. Go to **Settings → Booking Page**
2. The **Your Booking URL** section shows your full link in a copyable box
3. Click **Copy URL** to copy it to your clipboard, or **Open** to visit the page directly

## Customizing your URL slug

When your shop is first created, the URL slug is auto-generated from your shop name with the first 8 characters of your shop ID appended — for example: `my-barbershop-a6adc896`.

You can replace this with something cleaner:

1. In the **Your Booking URL** section, click **Customize URL slug**
2. Type your desired slug — only lowercase letters, numbers, and hyphens are allowed (`a–z`, `0–9`, `-`)
3. If you type uppercase letters, spaces, or special characters, the app will show a preview of what the slug will be cleaned to before saving
4. Press **Enter** or click **Save**
5. Your booking URL updates immediately

> **Note:** URL slugs must be unique across all Stand Tall Booking shops. If the slug you want is already taken, you'll see an error and can try a different one.

## Sharing your booking link

Once your URL is set, share it everywhere clients might look:

- **Instagram bio** — the most impactful placement for most barbershops
- **Google Business profile** — go to your Google Business listing and add it as your website URL
- **Text/SMS to clients** — paste it directly when they ask how to book
- **Facebook page** — add it to your About section or link it in posts
- **Your shop website** — use the embed options below to put the booking form directly on your site

## Embedding the booking form on your website

If you have your own website, you can embed the booking form so clients never leave your site to book.

Go to **Settings → Booking Page → Embed on Your Website**. There are two options:

**Option A — iFrame** (easiest)
```html
<iframe
  src="https://standtallbooking.com/book/your-slug?embed=true"
  width="100%"
  height="700"
  frameborder="0"
  style="border-radius:12px;"
></iframe>
```
Best for: Squarespace, Wix, Webflow, or any site where you can add a custom code block.

**Option B — Script tag** (one-line drop-in)
```html
<script
  src="https://standtallbooking.com/embed.js"
  data-shop="your-slug">
</script>
```
Best for: WordPress, custom HTML, or if you prefer a lighter-weight single line. The widget is responsive and adapts to any screen size.

Click **Copy** on either snippet to copy it to your clipboard, then paste it into your website's HTML.

![New booking modal](/help-assets/screenshots/calendar/new-booking-modal.png)
