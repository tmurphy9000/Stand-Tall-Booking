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

function buildHtml(confirmationUrl: string): string {
  const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6993eba91209ee0a1089f355/fd9cfe023_6f5fd5cc-8fc9-4041-9d87-c24e77a3bc58.png";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">

        <!-- Logo + shop name -->
        <tr><td align="center" style="padding-bottom:32px">
          <img src="${logoUrl}" width="72" height="72" style="border-radius:16px;display:block;margin:0 auto 14px" alt="Stand Tall Booking">
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">Stand Tall Booking</span>
        </td></tr>

        <!-- Hero card -->
        <tr><td style="background:#141414;border-radius:20px;padding:32px;border:1px solid #2a2a2a">
          <p style="margin:0 0 6px;color:#8B9A7E;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px">Confirm your account</p>
          <h1 style="margin:0 0 16px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px">Welcome to Stand Tall Booking.</h1>
          <p style="margin:0 0 28px;color:#aaa;font-size:15px;line-height:1.6">Click the link below to confirm your email and activate your account.</p>

          <table cellpadding="0" cellspacing="0">
            <tr><td style="border-radius:6px;background:#8B9A7E">
              <a href="${confirmationUrl}" style="display:inline-block;padding:14px 28px;color:#0D0D0D;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.04em">CONFIRM EMAIL →</a>
            </td></tr>
          </table>

          <p style="margin:24px 0 0;color:#666;font-size:12px;line-height:1.6">
            If the button above doesn't work, copy and paste this link into your browser:<br>
            <a href="${confirmationUrl}" style="color:#8B9A7E;word-break:break-all">${confirmationUrl}</a>
          </p>
        </td></tr>

        <!-- Footer note -->
        <tr><td style="padding:24px 0 0;text-align:center">
          <p style="margin:0;color:#333;font-size:11px">
            © ${new Date().getFullYear()} Stand Tall Booking. All rights reserved.
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
    console.error("[send-verification-email] RESEND_API_KEY secret not set");
    return json({ error: "Email service not configured" });
  }

  let body: { email?: string; confirmationUrl?: string };

  try {
    body = await req.json();
  } catch (e) {
    console.error("[send-verification-email] Failed to parse body:", e);
    return json({ error: "Invalid request body" });
  }

  const { email, confirmationUrl } = body;

  if (!email || !confirmationUrl) {
    console.error("[send-verification-email] Missing required fields:", body);
    return json({ error: "Missing required fields" });
  }

  console.log("[send-verification-email] Sending to:", email);

  const html = buildHtml(confirmationUrl);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Stand Tall Booking <bookings@standtallbooking.com>",
      to: [email],
      subject: "Confirm your Stand Tall Booking account",
      html,
    }),
  });

  const resBody = await res.json();

  if (!res.ok) {
    console.error("[send-verification-email] Resend API error:", resBody);
    return json({ error: resBody?.message ?? "Failed to send email" });
  }

  console.log("[send-verification-email] Email sent, id:", resBody.id);
  return json({ success: true, id: resBody.id });
});
