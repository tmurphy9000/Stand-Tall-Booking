import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const CHUNK_SIZE = 40000;
const CHUNK_OVERLAP = 500;
const INSERT_BATCH_SIZE = 200;

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

function chunkText(text: string): string[] {
  if (text.length <= CHUNK_SIZE) return [text];
  const chunks: string[] = [];
  const step = CHUNK_SIZE - CHUNK_OVERLAP;
  for (let start = 0; start < text.length; start += step) {
    chunks.push(text.slice(start, start + CHUNK_SIZE));
    if (start + CHUNK_SIZE >= text.length) break;
  }
  return chunks;
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
      model: "claude-opus-4-6",
      max_tokens: 4096,
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
  try {
    return JSON.parse(responseText);
  } catch {
    const match = responseText.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("Could not parse client data from AI response");
    return JSON.parse(match[0]);
  }
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

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400, headers: corsHeaders });
  }

  const jobId = body?.id;
  if (!jobId) {
    return Response.json({ error: "id is required" }, { status: 400, headers: corsHeaders });
  }

  const { data: job, error: jobError } = await supabase
    .from("client_imports")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return Response.json({ error: "Import job not found" }, { status: 404, headers: corsHeaders });
  }

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

    const chunks = chunkText(text);
    let clients: Client[] = [];
    for (const chunk of chunks) {
      const chunkClients = await extractClientsFromChunk(chunk);
      clients = clients.concat(chunkClients);
    }

    clients = dedupeClients(clients).filter((c) => c.name);

    await supabase
      .from("client_imports")
      .update({ total_clients: clients.length, imported_clients: 0, updated_at: new Date().toISOString() })
      .eq("id", jobId);

    for (let i = 0; i < clients.length; i += INSERT_BATCH_SIZE) {
      const batch = clients.slice(i, i + INSERT_BATCH_SIZE).map((c) => ({
        name: c.name,
        email: c.email || null,
        phone: c.phone || null,
        shop_id: job.shop_id,
      }));

      const { error: insertError } = await supabase.from("clients").insert(batch);
      if (insertError) throw new Error("Failed to insert clients: " + insertError.message);

      const processed = Math.min(i + batch.length, clients.length);
      await supabase
        .from("client_imports")
        .update({ imported_clients: processed, updated_at: new Date().toISOString() })
        .eq("id", jobId);
    }

    await supabase
      .from("client_imports")
      .update({ status: "done", updated_at: new Date().toISOString() })
      .eq("id", jobId);

    return Response.json({ success: true, count: clients.length }, { headers: corsHeaders });
  } catch (err) {
    await supabase
      .from("client_imports")
      .update({ status: "failed", error: String(err?.message || err), updated_at: new Date().toISOString() })
      .eq("id", jobId);

    return Response.json({ error: String(err?.message || err) }, { status: 500, headers: corsHeaders });
  }
});
