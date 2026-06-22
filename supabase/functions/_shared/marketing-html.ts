// Shared email HTML builder — imported by send-marketing-email and all automation functions.

export function wrapLinks(html: string, sendId: string, trackBase: string): string {
  return html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (_, url) =>
      `href="${trackBase}/click?sid=${sendId}&url=${encodeURIComponent(url)}"`,
  );
}

export function buildMarketingHtml(args: {
  client_name: string;
  body_html: string;
  shop_name: string;
  booking_url: string;
  promo_code?: string;
  send_id: string;
  track_base: string;
}): string {
  const { client_name, body_html, shop_name, booking_url, promo_code, send_id, track_base } = args;

  const content = (body_html || "")
    .replace(/\{\{client_name\}\}/g, client_name)
    .replace(
      /\{\{booking_link\}\}/g,
      `<a href="${booking_url}" style="display:inline-block;margin:8px 0;padding:12px 24px;background:#0A0A0A;color:#ffffff;text-decoration:none;border-radius:6px;font-family:Helvetica,sans-serif;font-size:14px;font-weight:600">Book Your Appointment →</a>`,
    )
    .replace(
      /\{\{promo_code\}\}/g,
      promo_code
        ? `<span style="display:inline-block;padding:8px 16px;background:#F5F5F0;border:2px dashed #8B9A7E;border-radius:4px;font-family:monospace;font-size:18px;font-weight:700;letter-spacing:3px;color:#0A0A0A">${promo_code}</span>`
        : '<span style="color:#999">[promo code]</span>',
    );

  const pixel = `<img src="${track_base}/open?sid=${send_id}" width="1" height="1" style="width:1px!important;height:1px!important;border:0;display:block" alt="">`;

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${shop_name}</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F0;font-family:Georgia,serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:#0A0A0A;padding:28px 40px;text-align:center">
            <p style="margin:0;color:#8B9A7E;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px">${shop_name}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;color:#333333;font-size:15px;line-height:1.8">
            ${pixel}
            ${content}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #F0F0F0;text-align:center">
            <p style="margin:0;font-size:11px;color:#999999;font-family:Helvetica,sans-serif">
              You're receiving this email as a valued client of ${shop_name}.<br>
              To unsubscribe, reply to this email with the word <strong>unsubscribe</strong>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return wrapLinks(html, send_id, track_base);
}
