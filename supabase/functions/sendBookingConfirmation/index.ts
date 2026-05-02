const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formatDate(dateStr: string): string {
  // dateStr: "YYYY-MM-DD"
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function formatTime(timeStr: string): string {
  // timeStr: "HH:MM"
  const [h, m] = timeStr.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function buildHtml(booking: {
  client_name: string;
  barber_name: string;
  service_name: string;
  date: string;
  start_time: string;
  end_time: string;
  shop_name?: string;
  shop_address?: string;
  shop_phone?: string;
}): string {
  const {
    client_name,
    barber_name,
    service_name,
    date,
    start_time,
    end_time,
    shop_name = "Stand Tall Barbershop",
    shop_address,
    shop_phone,
  } = booking;

  const dateLabel  = formatDate(date);
  const timeLabel  = `${formatTime(start_time)} – ${formatTime(end_time)}`;
  const logoUrl    = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6993eba91209ee0a1089f355/fd9cfe023_6f5fd5cc-8fc9-4041-9d87-c24e77a3bc58.png";

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#888;font-size:13px;width:120px">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#ffffff;font-size:13px;font-weight:600">${value}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">

        <!-- Logo + shop name -->
        <tr><td align="center" style="padding-bottom:32px">
          <img src="${logoUrl}" width="72" height="72" style="border-radius:16px;display:block;margin:0 auto 14px" alt="${shop_name}">
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">${shop_name}</span>
        </td></tr>

        <!-- Hero card -->
        <tr><td style="background:#141414;border-radius:20px;padding:32px;border:1px solid #2a2a2a">

          <!-- Heading -->
          <p style="margin:0 0 6px;color:#8B9A7E;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px">Booking Confirmed</p>
          <h1 style="margin:0 0 8px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px">Your appointment is confirmed!</h1>
          <p style="margin:0 0 28px;color:#888;font-size:15px">Hi ${client_name}, we look forward to seeing you.</p>

          <!-- Details table -->
          <table width="100%" cellpadding="0" cellspacing="0">
            ${row("Barber",   barber_name)}
            ${row("Service",  service_name)}
            ${row("Date",     dateLabel)}
            ${row("Time",     timeLabel)}
            ${shop_address ? row("Location", shop_address) : ""}
            ${shop_phone   ? row("Phone",    shop_phone)   : ""}
          </table>

        </td></tr>

        <!-- Footer note -->
        <tr><td style="padding:24px 0 0;text-align:center">
          <p style="margin:0;color:#555;font-size:12px">
            Need to reschedule? Contact us at ${shop_phone ?? shop_name}.
          </p>
          <p style="margin:8px 0 0;color:#333;font-size:11px">
            © ${new Date().getFullYear()} ${shop_name}. All rights reserved.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("[sendBookingConfirmation] RESEND_API_KEY secret not set");
    return json({ error: "Email service not configured" });
  }

  let body: {
    client_name?: string;
    client_email?: string;
    barber_name?: string;
    service_name?: string;
    date?: string;
    start_time?: string;
    end_time?: string;
    shop_name?: string;
    shop_address?: string;
    shop_phone?: string;
  };

  try {
    body = await req.json();
  } catch (e) {
    console.error("[sendBookingConfirmation] Failed to parse body:", e);
    return json({ error: "Invalid request body" });
  }

  const { client_name, client_email, barber_name, service_name, date, start_time, end_time } = body;

  if (!client_email || !client_name || !barber_name || !service_name || !date || !start_time || !end_time) {
    console.error("[sendBookingConfirmation] Missing required fields:", body);
    return json({ error: "Missing required fields" });
  }

  console.log("[sendBookingConfirmation] Sending to:", client_email, "for booking on", date);

  const html = buildHtml({
    client_name,
    barber_name,
    service_name,
    date,
    start_time,
    end_time,
    shop_name:    body.shop_name,
    shop_address: body.shop_address,
    shop_phone:   body.shop_phone,
  });

  const shopName = body.shop_name || "Stand Tall Barbershop";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Stand Tall Booking <onboarding@resend.dev>",
      to: [client_email],
      subject: `Appointment Confirmed — ${shopName}`,
      html,
    }),
  });

  const resBody = await res.json();

  if (!res.ok) {
    console.error("[sendBookingConfirmation] Resend API error:", resBody);
    return json({ error: resBody?.message ?? "Failed to send email" });
  }

  console.log("[sendBookingConfirmation] Email sent, id:", resBody.id);
  return json({ success: true, id: resBody.id });
});
