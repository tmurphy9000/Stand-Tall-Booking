// Public tracking endpoints — JWT verification disabled at deploy time.
// Security: the sid parameter is a random UUID from campaign_sends.id,
// which is unguessable without access to the database.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 1×1 transparent GIF (standard tracking pixel)
const GIF_BYTES = Uint8Array.from(
  atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
  (c) => c.charCodeAt(0),
);

const GIF_RESPONSE = new Response(GIF_BYTES, {
  status: 200,
  headers: {
    "Content-Type": "image/gif",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  },
});

Deno.serve(async (req) => {
  const url      = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const route    = segments[segments.length - 1]; // 'open' or 'click'
  const sid      = url.searchParams.get("sid");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // ── /open ───────────────────────────────────────────────────────────────────
  if (route === "open") {
    if (sid && supabaseUrl && serviceKey) {
      const db = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      // Only record the first open; ignore subsequent loads
      await db
        .from("campaign_sends")
        .update({ opened_at: new Date().toISOString() })
        .eq("id", sid)
        .is("opened_at", null);
    }
    return GIF_RESPONSE;
  }

  // ── /click ──────────────────────────────────────────────────────────────────
  if (route === "click") {
    const rawDest   = url.searchParams.get("url");
    const destination = rawDest ? decodeURIComponent(rawDest) : "https://standtallbooking.com";

    if (sid && supabaseUrl && serviceKey) {
      const db = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      // Only record the first click
      await db
        .from("campaign_sends")
        .update({ clicked_at: new Date().toISOString() })
        .eq("id", sid)
        .is("clicked_at", null);
    }

    return new Response(null, {
      status: 302,
      headers: { Location: destination },
    });
  }

  return new Response("Not found", { status: 404 });
});
