import "@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

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

      if (!file) {
        return Response.json({ error: "No file provided" }, { status: 400 });
      }

      const fileBytes = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(fileBytes)));
      const mimeType = file.type || "application/pdf";

      const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-opus-4-6",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "document",
                  source: {
                    type: "base64",
                    media_type: mimeType,
                    data: base64,
                  },
                },
                {
                  type: "text",
                  text: "This is a client list exported from a booking or salon software. Extract ALL clients and return ONLY a JSON array with no other text, no markdown, no backticks. Each object should have these fields: name (full name as single string), email, phone. Use empty string for any missing field.",
                },
              ],
            },
          ],
        }),
      });

      const aiResult = await anthropicResponse.json();
      const rawText = aiResult.content[0].text.trim();
      const clients = JSON.parse(rawText);

      return Response.json(
        { clients, count: clients.length },
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        }
      );
    } catch (err) {
      return Response.json(
        { error: String(err) },
        { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }
  },
};
