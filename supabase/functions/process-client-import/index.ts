import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const INSERT_BATCH_SIZE = 200;
const CHUNK_CHARS = 100000;
// If a chunk is too dense for the AI to return in one response, split it in
// half and retry each half. Stop splitting below this size.
const MIN_SPLIT_CHARS = 50000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROMPT = "Extract all clients from the following text, which was extracted from an uploaded file. Return ONLY a JSON array, no markdown. Each item: {name, email, phone}. Use empty string for missing fields.\n\n";

type Client = { name: string; email: string; phone: string };

// Uploaded files (CSV, PDF, etc.) may not be valid UTF-8, so pull out the
// printable ASCII runs (the actual client data) and drop binary noise.
function extractAsciiText(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes);
  const runs = raw.match(/[\x20-\x7E]{4,}/g) || [];
  return runs.join("\n");
}

async function extractClientsFromChunk(chunk: string): Promise<Client[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: [{ type: "text", text: PROMPT + chunk }],
      }],
    }),
  });

  const ai = await res.json();
  if (ai.error) throw new Error(ai.error.message || JSON.stringify(ai.error));
  if (!ai.content || !ai.content[0] || typeof ai.content[0].text !== "string") {
    throw new Error("Unexpected AI response: " + JSON.stringify(ai));
  }

  const responseText = ai.content[0].text.trim();
  const truncated = ai.stop_reason === "max_tokens";

  let clients: Client[] | null = null;
  try {
    clients = JSON.parse(responseText);
  } catch {
    const match = responseText.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        clients = JSON.parse(match[0]);
      } catch {
        clients = null;
      }
    }
  }

  // A truncated or unparseable response means this chunk had too many
  // clients for one reply. Split it in half (on a line boundary) and retry
  // each half separately.
  if (truncated || clients === null) {
    if (chunk.length <= MIN_SPLIT_CHARS) {
      throw new Error("Could not parse client data from AI response (chunk too dense to split further)");
    }

    const mid = Math.floor(chunk.length / 2);
    const newlineIdx = chunk.indexOf("\n", mid);
    const splitAt = newlineIdx === -1 ? mid : newlineIdx + 1;

    const [first, second] = await Promise.all([
      extractClientsFromChunk(chunk.slice(0, splitAt)),
      extractClientsFromChunk(chunk.slice(splitAt)),
    ]);
    return [...first, ...second];
  }

  return clients;
}

function dedupeClients(clients: Client[]): Client[] {
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  const result: Client[] = [];

  for (const c of clients) {
    const email = (c.email || "").trim().toLowerCase();
    const phone = (c.phone || "").replace(/\D/g, "");

    if (email && seenEmails.has(email)) continue;
    if (phone && seenPhones.has(phone)) continue;

    if (email) seenEmails.add(email);
    if (phone) seenPhones.add(phone);
    result.push(c);
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  let body: { job_id?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400, headers: corsHeaders });
  }

  const jobId = body?.job_id;

  if (!jobId) {
    return Response.json({ error: "job_id is required" }, { status: 400, headers: corsHeaders });
  }

  const { data: job, error: jobError } = await supabase
    .from("client_imports")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return Response.json({ error: "Import job not found" }, { status: 404, headers: corsHeaders });
  }

  if (job.status === "done") {
    return Response.json({ done: true, imported_clients: job.imported_clients }, { headers: corsHeaders });
  }

  // Resume from where a previous, interrupted invocation left off.
  let chunkStart = job.status === "processing" ? (job.last_chunk || 0) : 0;
  let importedTotal = job.imported_clients || 0;

  await supabase
    .from("client_imports")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  try {
    const { data: file, error: downloadError } = await supabase.storage
      .from("client-imports")
      .download(job.file_path);

    if (downloadError || !file) {
      throw new Error("Failed to download file: " + (downloadError?.message || "not found"));
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const text = extractAsciiText(bytes).trim();

    if (!text) {
      throw new Error("Could not extract any text from that file");
    }

    while (chunkStart < text.length) {
      const chunkEnd = Math.min(chunkStart + CHUNK_CHARS, text.length);
      const slice = text.slice(chunkStart, chunkEnd);

      let clients: Client[] = [];
      if (slice.trim()) {
        clients = await extractClientsFromChunk(slice);
        clients = dedupeClients(clients).filter((c) => c.name);
      }

      for (let i = 0; i < clients.length; i += INSERT_BATCH_SIZE) {
        const batch = clients.slice(i, i + INSERT_BATCH_SIZE).map((c) => ({
          name: c.name,
          email: c.email || null,
          phone: c.phone || null,
          shop_id: job.shop_id,
        }));

        const { error: insertError } = await supabase.from("clients").insert(batch);
        if (insertError) throw new Error("Failed to insert clients: " + insertError.message);
      }

      importedTotal += clients.length;
      chunkStart = chunkEnd;

      await supabase
        .from("client_imports")
        .update({
          imported_clients: importedTotal,
          last_chunk: chunkStart,
          total_chars: text.length,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }

    await supabase
      .from("client_imports")
      .update({ status: "done", updated_at: new Date().toISOString() })
      .eq("id", jobId);

    return Response.json({ done: true, imported_clients: importedTotal }, { headers: corsHeaders });
  } catch (err) {
    await supabase
      .from("client_imports")
      .update({ status: "failed", error: String(err?.message || err), updated_at: new Date().toISOString() })
      .eq("id", jobId);

    return Response.json({ error: String(err?.message || err) }, { status: 500, headers: corsHeaders });
  }
});
