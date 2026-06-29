import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT =
  "You are an AI assistant for Stand Tall Booking, a barbershop management app. " +
  "You help barbers and shop owners with scheduling questions, client notes, service recommendations, " +
  "and general barbershop business advice. Be concise, friendly, and professional.";

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // per minute

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!apiKey || !supabaseUrl || !serviceRoleKey) {
    return json({ error: "Server configuration error" }, 500);
  }

  // Require authenticated caller
  const authHeader = req.headers.get("authorization") || "";
  const jwt = authHeader.replace(/^bearer\s+/i, "");
  if (!jwt) return json({ error: "Unauthorized" }, 401);

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  // Per-user per-minute rate limit via Deno KV
  try {
    const kv = await Deno.openKv();
    const key = ["ai_rate_limit", user.id];
    const entry = await kv.get<number[]>(key);
    const now = Date.now();
    const timestamps = (entry.value ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

    if (timestamps.length >= RATE_LIMIT_MAX) {
      return json({ error: "Rate limit exceeded. Please wait before sending more messages." }, 429);
    }

    timestamps.push(now);
    await kv.set(key, timestamps, { expireIn: RATE_LIMIT_WINDOW_MS });
  } catch {
    // KV unavailable — auth is still enforced; allow request through
  }

  let body: { message?: string; conversationHistory?: Array<{ role: string; content: string }> };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const message = (body.message || "").trim();
  if (!message) {
    return json({ error: "Message is required" }, 400);
  }

  const conversationHistory = Array.isArray(body.conversationHistory) ? body.conversationHistory : [];

  const messages = [
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });
  } catch (fetchErr) {
    console.error("[ai-assistant] fetch to Anthropic threw:", fetchErr);
    return json({ error: "Failed to reach AI service" }, 500);
  }

  const responseBody = await anthropicRes.json();

  if (!anthropicRes.ok) {
    console.error("[ai-assistant] Anthropic returned non-2xx:", anthropicRes.status, JSON.stringify(responseBody));
    return json({ error: responseBody?.error?.message || "AI service error" }, anthropicRes.status);
  }

  const reply = responseBody?.content
    ?.filter((block: { type: string }) => block.type === "text")
    ?.map((block: { text: string }) => block.text)
    ?.join("") || "";

  console.log("[ai-assistant] success, reply length:", reply.length);
  return json({ reply });
});
