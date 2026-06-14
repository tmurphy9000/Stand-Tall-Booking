function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildHtml(confirmationUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D0D0D;font-family:Arial, sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D0D;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:32px">
          <span style="color:#8B9A7E;font-size:18px;font-weight:bold;letter-spacing:2px">STAND TALL BOOKING</span>
        </td></tr>

        <!-- Hero card -->
        <tr><td style="background:#1A1A1A;border-radius:12px;padding:32px;border:1px solid #2a2a2a">
          <h1 style="margin:0 0 16px;color:#F2F0EB;font-size:24px;font-weight:bold">Welcome. Let's confirm your email.</h1>
          <p style="margin:0 0 28px;color:#F2F0EB;font-size:15px;line-height:1.6">Click the button below to verify your email address and activate your account. This link expires in 24 hours.</p>

          <table cellpadding="0" cellspacing="0">
            <tr><td style="border-radius:6px;background:#8B9A7E">
              <a href="${confirmationUrl}" style="display:inline-block;padding:14px 28px;color:#0D0D0D;font-size:15px;font-weight:bold;text-decoration:none">Confirm my email</a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer note -->
        <tr><td style="padding:24px 0 0;text-align:center">
          <p style="margin:0;color:#F2F0EB;font-size:11px;line-height:1.6">
            If you didn't create an account with Stand Tall Booking, you can safely ignore this email. © 2026 Stand Tall Booking
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("[send-verification-email] RESEND_API_KEY secret not set");
    return json({ error: { http_code: 500, message: "Email service not configured" } }, 500);
  }

  const payload = await req.json();
  const userId: string = payload.user?.id;
  const email: string = payload.user?.email;
  const tokenHash: string = payload.email_data?.token_hash;

  const confirmationUrl = `https://mmmkachplbkaxvhauhaa.supabase.co/auth/v1/verify?token=${tokenHash}&type=signup&redirect_to=https://www.standtallbooking.com`;

  console.log("[send-verification-email] Sending to:", email, "user_id:", userId);

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
      html: buildHtml(confirmationUrl),
    }),
  });

  const resBody = await res.json();

  if (!res.ok) {
    console.error("[send-verification-email] Resend API error:", resBody);
    return json({ error: { http_code: 500, message: resBody?.message ?? "Failed to send email" } }, 500);
  }

  console.log("[send-verification-email] Email sent, id:", resBody.id);
  return json({});
});
