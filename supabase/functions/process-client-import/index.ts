import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const INSERT_BATCH_SIZE = 200;
// Chunk size for structured (column-mapped) files, which cost no API calls.
const CHUNK_CHARS = 100000;
// Larger chunk size for the per-chunk AI fallback, to reduce API call count.
const AI_CHUNK_CHARS = 150000;
const FORMAT_DETECTION_CHARS = 10000;
// If an AI chunk is too dense for the AI to return in one response, split it
// in half and retry each half. Stop splitting below this size.
const MIN_SPLIT_CHARS = 50000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Client = { name: string; email: string; phone: string };

type Delimiter = "\t" | "," | "|" | "ws";

// Structured (CSV/tabular) files are parsed for free using a detected column
// layout. Anything else falls back to per-chunk AI extraction.
type StructuredMapping = {
  mode: "structured";
  delimiter: Delimiter;
  headerEndOffset: number;
  nameCol: number | null;
  firstNameCol: number | null;
  lastNameCol: number | null;
  emailCol: number | null;
  phoneCol: number | null;
};

type AiMapping = { mode: "ai" };

type ColumnMapping = StructuredMapping | AiMapping;

type HeaderCategory = "name" | "firstName" | "lastName" | "email" | "phone";

// Uploaded files (CSV, PDF, etc.) may not be valid UTF-8, so pull out the
// printable ASCII runs (the actual client data) and drop binary noise.
function extractAsciiText(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes);
  const runs = raw.match(/[\x20-\x7E]{4,}/g) || [];
  return runs.join("\n");
}

// Paths for cached derivatives of an uploaded file, alongside the original.
function toTxtPath(filePath: string): string {
  return filePath.replace(/\.[^./]+$/, "") + ".txt";
}

function toMappingPath(filePath: string): string {
  return filePath.replace(/\.[^./]+$/, "") + ".mapping.json";
}

// A simple CSV line splitter that understands double-quoted fields.
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }

  fields.push(cur);
  return fields;
}

function splitLine(line: string, delimiter: Delimiter): string[] {
  switch (delimiter) {
    case "\t":
      return line.split("\t");
    case "|":
      return line.split("|");
    case "ws":
      return line.trim().split(/\s{2,}/);
    case ",":
      return splitCsvLine(line);
    default:
      return [line];
  }
}

// Identify a header field like "First Name", "E-mail", "Cell Phone", etc.
function categorizeHeader(field: string): HeaderCategory | null {
  const normalized = field.trim().toLowerCase().replace(/[^a-z]+/g, " ").trim();
  if (!normalized) return null;

  if (["name", "full name", "client name", "customer name"].includes(normalized)) return "name";

  const words = normalized.split(" ");

  // "Last Visited", "Customer Since", etc. contain "first"/"last" but are
  // not name columns and must never be mistaken for one.
  if (words.includes("visited") || words.includes("since") || words.includes("seen")) return null;

  if (normalized === "first" || (words.includes("first") && words.includes("name"))) return "firstName";
  if (normalized === "last" || (words.includes("last") && words.includes("name"))) return "lastName";
  if (words.includes("email") || words.includes("mail")) return "email";
  if (words.includes("phone") || words.includes("mobile") || words.includes("cell") || words.includes("telephone")) return "phone";

  return null;
}

// Scan the first ~50 lines of extracted text for a header row whose fields
// match known client-list column names, trying a few common delimiters.
function detectColumnMapping(text: string): StructuredMapping | null {
  const delimiters: Delimiter[] = ["\t", ",", "|", "ws"];
  const lines = text.split("\n");
  let offset = 0;

  for (let i = 0; i < Math.min(lines.length, 50); i++) {
    const line = lines[i];
    const lineEnd = offset + line.length + 1;

    for (const delimiter of delimiters) {
      const fields = splitLine(line, delimiter);
      if (fields.length < 2) continue;

      const cols: Partial<Record<HeaderCategory, number>> = {};
      fields.forEach((field, idx) => {
        const cat = categorizeHeader(field);
        if (cat && cols[cat] === undefined) cols[cat] = idx;
      });

      const hasName = cols.name !== undefined || cols.firstName !== undefined || cols.lastName !== undefined;
      const hasContact = cols.email !== undefined || cols.phone !== undefined;

      if (hasName && hasContact && Object.keys(cols).length >= 2) {
        return {
          mode: "structured",
          delimiter,
          headerEndOffset: Math.min(lineEnd, text.length),
          nameCol: cols.name ?? null,
          firstNameCol: cols.firstName ?? null,
          lastNameCol: cols.lastName ?? null,
          emailCol: cols.email ?? null,
          phoneCol: cols.phone ?? null,
        };
      }
    }

    offset = lineEnd;
  }

  return null;
}

const FORMAT_DETECTION_PROMPT = `The text below was extracted from a client list export (CSV or PDF). Each client is on its own line, with fields separated by a consistent delimiter (comma, tab, pipe, or two-or-more spaces).

Respond with ONLY a JSON object, no markdown:
- If you can identify the delimiter, the header row, and which columns hold the client's name (or first/last name), email, and phone, respond with:
{"found": true, "delimiter": ",", "headerLineIndex": 0, "nameCol": null, "firstNameCol": 0, "lastNameCol": 1, "emailCol": 2, "phoneCol": 3}
  - "delimiter" must be one of "\\t", ",", "|", or "ws" (meaning two-or-more spaces).
  - Column indexes are 0-based positions after splitting a line by the delimiter.
  - Use either "nameCol" (a single combined name column) or "firstNameCol"/"lastNameCol", whichever applies. Set unused fields to null.
  - "headerLineIndex" is the 0-based line number of the header row in the text below.
- If the data is not laid out this way (e.g. free-form text, names embedded in paragraphs), respond with ONLY: {"found": false}

Text:
`;

// Single AI call: ask once, on a small prefix of the file, to describe the
// column layout so every later chunk can be parsed without any API call.
async function detectMappingViaAI(text: string): Promise<StructuredMapping | null> {
  const prefix = text.slice(0, FORMAT_DETECTION_CHARS);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [{ type: "text", text: FORMAT_DETECTION_PROMPT + prefix }],
      }],
    }),
  });

  const ai = await res.json();
  if (ai.error) throw new Error(ai.error.message || JSON.stringify(ai.error));
  if (!ai.content || !ai.content[0] || typeof ai.content[0].text !== "string") {
    throw new Error("Unexpected AI response: " + JSON.stringify(ai));
  }

  const responseText = ai.content[0].text.trim();
  let result: any = null;
  try {
    result = JSON.parse(responseText);
  } catch {
    const match = responseText.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        result = JSON.parse(match[0]);
      } catch {
        result = null;
      }
    }
  }

  if (!result?.found) return null;
  if (!["\t", ",", "|", "ws"].includes(result.delimiter)) return null;

  const nameCol = typeof result.nameCol === "number" ? result.nameCol : null;
  const firstNameCol = typeof result.firstNameCol === "number" ? result.firstNameCol : null;
  const lastNameCol = typeof result.lastNameCol === "number" ? result.lastNameCol : null;
  const emailCol = typeof result.emailCol === "number" ? result.emailCol : null;
  const phoneCol = typeof result.phoneCol === "number" ? result.phoneCol : null;

  if (nameCol === null && firstNameCol === null && lastNameCol === null) return null;

  const headerLineIndex = typeof result.headerLineIndex === "number" ? result.headerLineIndex : -1;
  const lines = text.split("\n");
  let offset = 0;
  for (let i = 0; i <= headerLineIndex && i < lines.length; i++) {
    offset += lines[i].length + 1;
  }

  return {
    mode: "structured",
    delimiter: result.delimiter as Delimiter,
    headerEndOffset: Math.min(offset, text.length),
    nameCol,
    firstNameCol,
    lastNameCol,
    emailCol,
    phoneCol,
  };
}

const CLIENT_EXTRACTION_PROMPT = "Extract all clients from the following text, which was extracted from an uploaded file. Return ONLY a JSON array, no markdown. Each item: {name, email, phone}. Use empty string for missing fields.\n\n";

// Per-chunk AI fallback for files where no structured column layout could be
// detected (e.g. PDFs whose text is rendered as scattered fragments).
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
        content: [{ type: "text", text: CLIENT_EXTRACTION_PROMPT + chunk }],
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

// Parse one line of the extracted text into a client using the saved
// column mapping. Returns null for blank lines or lines with no name.
function parseClientFromLine(line: string, mapping: StructuredMapping): Client | null {
  if (!line.trim()) return null;

  const fields = splitLine(line, mapping.delimiter).map((f) => f.trim());

  let name = "";
  if (mapping.nameCol !== null) {
    name = fields[mapping.nameCol] || "";
  } else {
    const first = mapping.firstNameCol !== null ? fields[mapping.firstNameCol] || "" : "";
    const last = mapping.lastNameCol !== null ? fields[mapping.lastNameCol] || "" : "";
    name = [first, last].filter(Boolean).join(" ");
  }

  name = name.trim();
  if (!name) return null;

  return {
    name,
    email: mapping.emailCol !== null ? (fields[mapping.emailCol] || "").trim() : "",
    phone: mapping.phoneCol !== null ? (fields[mapping.phoneCol] || "").trim() : "",
  };
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

// Find the end of the chunk, snapped to a line boundary at or after `start`
// so lines are never split across chunks.
function findChunkEnd(text: string, start: number, rawTarget: number): number {
  const totalLength = text.length;
  const target = Math.max(rawTarget, start);
  if (target >= totalLength) return totalLength;

  const idx = text.lastIndexOf("\n", target);
  if (idx >= start) return idx + 1;

  const next = text.indexOf("\n", target);
  return next === -1 ? totalLength : next + 1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const authHeader = req.headers.get("authorization") || "";
  const jwt = authHeader.replace(/^bearer\s+/i, "");
  if (!jwt) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: { user } } = await supabase.auth.getUser(jwt);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  let body: { job_id?: string; chunk_start?: number; chunk_end?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400, headers: corsHeaders });
  }

  const jobId = body?.job_id;
  const chunkStart = body?.chunk_start ?? 0;
  const chunkEnd = body?.chunk_end;

  if (!jobId) {
    return Response.json({ error: "job_id is required" }, { status: 400, headers: corsHeaders });
  }

  if (typeof chunkEnd !== "number") {
    return Response.json({ error: "chunk_end is required" }, { status: 400, headers: corsHeaders });
  }

  const { data: job, error: jobError } = await supabase
    .from("client_imports")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return Response.json({ error: "Import job not found" }, { status: 404, headers: corsHeaders });
  }

  // Verify caller has access to this job's shop (barbers first, subscriptions fallback)
  const { data: callerBarber } = await supabase
    .from("barbers")
    .select("shop_id")
    .eq("user_id", user.id)
    .maybeSingle();
  let callerShopId: string | null = callerBarber?.shop_id ?? null;
  if (!callerBarber) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("shop_id")
      .eq("user_id", user.id)
      .maybeSingle();
    callerShopId = sub?.shop_id ?? null;
  }
  // Superadmin has shop_id = null → bypass; others must match the job's shop
  if (callerShopId !== null && job.shop_id !== callerShopId) {
    return Response.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
  }

  if (job.status === "done") {
    return Response.json({
      clients_found: 0,
      next_chunk_start: chunkStart,
      next_chunk_end: chunkEnd,
      total_length: job.total_chars || 0,
      done: true,
    }, { headers: corsHeaders });
  }

  try {
    const txtPath = toTxtPath(job.file_path);
    const mappingPath = toMappingPath(job.file_path);
    let text: string;
    let mapping: ColumnMapping;

    if (chunkStart === 0) {
      // First chunk: download the original (potentially large/binary) file,
      // extract its text once, and cache it so later chunks are cheap.
      const { data: file, error: downloadError } = await supabase.storage
        .from("client-imports")
        .download(job.file_path);

      if (downloadError || !file) {
        throw new Error("Failed to download file: " + (downloadError?.message || "not found"));
      }

      const bytes = new Uint8Array(await file.arrayBuffer());

      if (/\.xlsx$/i.test(job.file_path)) {
        // Spreadsheets are already tabular: convert the first sheet to CSV
        // so it flows through the same structured column-detection path.
        const workbook = XLSX.read(bytes, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("XLSX file has no sheets");
        const sheet = workbook.Sheets[sheetName];

        // Some exports (e.g. Vagaro) include metadata rows above the real
        // header row. Scan the first 10 rows for the one that looks like a
        // client-list header and drop everything before it.
        const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: true });
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const row = rows[i] || [];
          const cats = row.map((cell) => categorizeHeader(String(cell ?? "")));
          const hasName = cats.includes("firstName") || cats.includes("lastName") || cats.includes("name");
          const hasContact = cats.includes("email") || cats.includes("phone");
          if (hasName && hasContact) {
            headerRowIndex = i;
            break;
          }
        }

        const trimmedSheet = XLSX.utils.aoa_to_sheet(rows.slice(headerRowIndex));
        text = XLSX.utils.sheet_to_csv(trimmedSheet).trim();
      } else {
        text = extractAsciiText(bytes).trim();
      }

      if (!text) {
        throw new Error("Could not extract any text from that file");
      }

      const { error: txtUploadError } = await supabase.storage
        .from("client-imports")
        .upload(txtPath, text, { contentType: "text/plain", upsert: true });

      if (txtUploadError) {
        throw new Error("Failed to cache extracted text: " + txtUploadError.message);
      }

      // Try to detect a structured column layout (e.g. Vagaro's CSV exports)
      // so we can skip the AI entirely for every chunk. If that fails, fall
      // back to per-chunk AI extraction for the whole file.
      let detected = detectColumnMapping(text);
      if (!detected) {
        detected = await detectMappingViaAI(text);
      }
      mapping = detected ?? { mode: "ai" };

      const { error: mappingUploadError } = await supabase.storage
        .from("client-imports")
        .upload(mappingPath, JSON.stringify(mapping), { contentType: "application/json", upsert: true });

      if (mappingUploadError) {
        throw new Error("Failed to cache column mapping: " + mappingUploadError.message);
      }
    } else {
      const [{ data: textFile, error: textError }, { data: mappingFile, error: mappingError }] = await Promise.all([
        supabase.storage.from("client-imports").download(txtPath),
        supabase.storage.from("client-imports").download(mappingPath),
      ]);

      if (textError || !textFile) {
        throw new Error("Failed to download extracted text: " + (textError?.message || "not found"));
      }
      if (mappingError || !mappingFile) {
        throw new Error("Failed to download column mapping: " + (mappingError?.message || "not found"));
      }

      text = (await textFile.text()).trim();
      if (!text) {
        throw new Error("Could not extract any text from that file");
      }

      mapping = JSON.parse(await mappingFile.text());
    }

    const totalLength = text.length;
    let clients: Client[];
    let end: number;

    if (mapping.mode === "structured") {
      // Skip the header row on the very first chunk so it isn't parsed as a client.
      const start = chunkStart === 0 ? Math.min(mapping.headerEndOffset, totalLength) : chunkStart;
      end = findChunkEnd(text, start, Math.min(chunkEnd, totalLength));
      const slice = text.slice(start, end);

      clients = [];
      for (const line of slice.split("\n")) {
        const client = parseClientFromLine(line, mapping);
        if (client) clients.push(client);
      }
      clients = dedupeClients(clients);
    } else {
      end = Math.min(chunkEnd, totalLength);
      const slice = text.slice(chunkStart, end);

      clients = slice.trim() ? await extractClientsFromChunk(slice) : [];
      clients = dedupeClients(clients).filter((c) => c.name);
    }

    for (let i = 0; i < clients.length; i += INSERT_BATCH_SIZE) {
      const batch = clients.slice(i, i + INSERT_BATCH_SIZE).map((c) => ({
        name: c.name,
        email: c.email || null,
        phone: c.phone || null,
        shop_id: job.shop_id,
        is_verified: true,
      }));

      const { error: insertError } = await supabase.from("clients").insert(batch);
      if (insertError) throw new Error("Failed to insert clients: " + insertError.message);
    }

    const importedTotal = (job.imported_clients || 0) + clients.length;
    const done = end >= totalLength;

    await supabase
      .from("client_imports")
      .update({
        status: done ? "done" : "processing",
        imported_clients: importedTotal,
        last_chunk: end,
        total_chars: totalLength,
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    const chunkSize = mapping.mode === "ai" ? AI_CHUNK_CHARS : CHUNK_CHARS;
    const nextChunkStart = end;
    const nextChunkEnd = Math.min(end + chunkSize, totalLength);

    return Response.json({
      clients_found: clients.length,
      next_chunk_start: nextChunkStart,
      next_chunk_end: nextChunkEnd,
      total_length: totalLength,
      done,
    }, { headers: corsHeaders });
  } catch (err) {
    await supabase
      .from("client_imports")
      .update({ status: "failed", error: String(err?.message || err), updated_at: new Date().toISOString() })
      .eq("id", jobId);

    return Response.json({ error: String(err?.message || err) }, { status: 500, headers: corsHeaders });
  }
});
