import "@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const CHUNK_SIZE = 40000;
const CHUNK_OVERLAP = 500;

const PROMPT = "Extract all clients from the following text, which was extracted from an uploaded file. Return ONLY a JSON array, no markdown. Each item: {name, email, phone}. Use empty string for missing fields.\n\n";

// PDFs aren't valid UTF-8/text, so pull out the printable runs (the actual
// client data) and drop the binary structure noise around them.
function extractPdfText(bytes: Uint8Array): string {
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

async function extractClientsFromChunk(chunk: string): Promise<{ name: string; email: string; phone: string }[]> {
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

function dedupeClients(clients: { name: string; email: string; phone: string }[]) {
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  const result: { name: string; email: string; phone: string }[] = [];

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

export default {
  fetch: async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        },
      });
    }
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      if (!file) return Response.json({ error: "No file provided" }, { status: 400 });

      const bytes = new Uint8Array(await file.arrayBuffer());
      const isPdf = (file.type || "").includes("pdf") || file.name?.toLowerCase().endsWith(".pdf");

      const text = (isPdf ? extractPdfText(bytes) : new TextDecoder("utf-8").decode(bytes)).trim();

      if (!text) {
        return Response.json({ error: "Could not extract any text from that file" }, { status: 400 });
      }

      const chunks = chunkText(text);
      let clients: { name: string; email: string; phone: string }[] = [];
      for (const chunk of chunks) {
        const chunkClients = await extractClientsFromChunk(chunk);
        clients = clients.concat(chunkClients);
      }

      clients = dedupeClients(clients);

      return Response.json({ clients, count: clients.length }, {
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      });
    } catch (err) {
      return Response.json({ error: String(err) }, {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};
