export async function sendSms(to: string, body: string): Promise<{ ok: boolean; sid?: string; error?: string; twilioBody?: string }> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken  = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from       = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !from) {
    console.error("[sendSms] missing Twilio env vars");
    return { ok: false, error: "SMS service not configured" };
  }

  const digits = to.replace(/\D/g, "");
  const e164 = digits.length === 11 && digits.startsWith("1")
    ? `+${digits}`
    : digits.length === 10
    ? `+1${digits}`
    : `+${digits}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: e164, From: from, Body: body }).toString(),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[sendSms] Twilio error:", res.status, text);
      return { ok: false, error: `Twilio ${res.status}`, twilioBody: text };
    }
    const data = await res.json();
    console.log("[sendSms] sent to", e164, "sid:", data.sid);
    return { ok: true, sid: data.sid };
  } catch (e) {
    console.error("[sendSms] fetch threw:", e);
    return { ok: false, error: String(e) };
  }
}

export function smsFormatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function smsFormatTime(timeStr: string): string {
  const [h, min] = timeStr.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour   = h % 12 || 12;
  return `${hour}:${String(min).padStart(2, "0")} ${suffix}`;
}
