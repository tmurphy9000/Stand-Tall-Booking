import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ImportClients() {
  const [step, setStep] = useState("upload");
  const [file, setFile] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importedCount, setImportedCount] = useState(0);

  async function handleFile(f) {
    setFile(f);
    setError("");
    setLoading(true);
    setStep("processing");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append("file", f);

      const res = await fetch(
        `https://mmmkachplbkaxvhauhaa.supabase.co/functions/v1/import-clients`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        }
      );

      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setClients(result.clients);
      setStep("preview");
    } catch (err) {
      setError(err.message);
      setStep("upload");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("barbers")
        .select("shop_id")
        .eq("user_id", user.id)
        .single();

      const rows = clients.map((c) => ({
        name: c.name,
        email: c.email || null,
        phone: c.phone || null,
        shop_id: profile.shop_id,
      }));

      const { error: insertError } = await supabase
        .from("clients")
        .upsert(rows, { onConflict: "email", ignoreDuplicates: true });

      if (insertError) throw new Error(insertError.message);
      setImportedCount(rows.length);
      setStep("done");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("upload");
    setFile(null);
    setClients([]);
    setError("");
    setImportedCount(0);
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-xl font-semibold mb-6">Import Clients</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {step === "upload" && (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-12 cursor-pointer hover:bg-accent transition">
          <input
            type="file"
            className="hidden"
            accept=".pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg"
            onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
          />
          <div className="text-4xl mb-3">📁</div>
          <p className="font-medium text-gray-800">Drop your client list here</p>
          <p className="text-sm text-muted-foreground mt-1">PDF, CSV, Excel, or image — any format</p>
          <div className="flex gap-2 mt-4">
            {["PDF", "CSV", "Excel", "Image"].map((t) => (
              <span key={t} className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground">{t}</span>
            ))}
          </div>
        </label>
      )}

      {step === "processing" && (
        <div className="text-center py-16">
          <div className="text-4xl mb-4 animate-spin">⚙️</div>
          <p className="font-medium text-gray-800">AI is reading your file...</p>
          <p className="text-sm text-muted-foreground mt-1">This may take 15–30 seconds</p>
        </div>
      )}

      {step === "preview" && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Clients found</p>
              <p className="text-2xl font-semibold">{clients.length.toLocaleString()}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">With email</p>
              <p className="text-2xl font-semibold">{clients.filter((c) => c.email).length.toLocaleString()}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">With phone</p>
              <p className="text-2xl font-semibold">{clients.filter((c) => c.phone).length.toLocaleString()}</p>
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Phone</th>
                </tr>
              </thead>
              <tbody>
                {clients.slice(0, 8).map((c, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-accent">
                    <td className="p-3">{c.name || "—"}</td>
                    <td className="p-3 text-muted-foreground">{c.email || "—"}</td>
                    <td className="p-3 text-muted-foreground">{c.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={loading}
              className="flex-1 bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "Importing..." : `Import all ${clients.length.toLocaleString()} clients`}
            </button>
            <button onClick={reset} className="px-4 py-2.5 border rounded-lg hover:bg-accent">
              Start over
            </button>
          </div>
        </>
      )}

      {step === "done" && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">✅</div>
          <p className="text-xl font-semibold">{importedCount.toLocaleString()} clients imported</p>
          <p className="text-muted-foreground mt-1 mb-6">All clients are now in Stand Tall Booking</p>
          <button onClick={reset} className="px-6 py-2.5 border rounded-lg hover:bg-accent">
            Import another file
          </button>
        </div>
      )}
    </div>
  );
}
