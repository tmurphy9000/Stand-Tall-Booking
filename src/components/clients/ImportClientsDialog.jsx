import React, { useRef, useState } from "react";
import { entities } from "@/api/entities";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Loader2, Upload, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { parseClientImportCSV, normalizePhone, normalizeEmail } from "@/lib/clientCsv";

const PREVIEW_LIMIT = 50;
const IMPORT_CHUNK_SIZE = 200;

export default function ImportClientsDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState("upload"); // upload | preview | summary
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]); // parsed + annotated rows
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState(null);

  const { data: existingClients = [] } = useQuery({
    queryKey: ["clients", "all-for-import"],
    queryFn: () => entities.Client.list(),
    enabled: open,
  });

  const reset = () => {
    setStep("upload");
    setFileName("");
    setRows([]);
    setImporting(false);
    setSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (next) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    try {
      const text = await file.text();
      const { clients, headers } = parseClientImportCSV(text);

      if (clients.length === 0) {
        toast.error("No client rows found in that file.");
        return;
      }
      if (headers.length > 0 && !clients.some((c) => c.name || c.email || c.phone)) {
        toast.error("Couldn't recognize any name, email, or phone columns in that file.");
        return;
      }

      const existingPhones = new Set(
        existingClients.map((c) => normalizePhone(c.phone)).filter(Boolean)
      );
      const existingEmails = new Set(
        existingClients.map((c) => normalizeEmail(c.email)).filter(Boolean)
      );
      const seenPhones = new Set();
      const seenEmails = new Set();

      const annotated = clients.map((c) => {
        const phone = normalizePhone(c.phone);
        const email = normalizeEmail(c.email);

        let status = "new";
        if (!c.name) {
          status = "invalid";
        } else if (
          (phone && existingPhones.has(phone)) ||
          (email && existingEmails.has(email)) ||
          (phone && seenPhones.has(phone)) ||
          (email && seenEmails.has(email))
        ) {
          status = "duplicate";
        }

        if (status === "new") {
          if (phone) seenPhones.add(phone);
          if (email) seenEmails.add(email);
        }

        return { ...c, status };
      });

      setRows(annotated);
      setStep("preview");
    } catch (err) {
      toast.error("Failed to read file", { description: err.message });
    }
  };

  const handleImport = async () => {
    const toImport = rows
      .filter((r) => r.status === "new")
      .map(({ status, ...client }) => client);

    setImporting(true);
    let imported = 0;
    try {
      for (let i = 0; i < toImport.length; i += IMPORT_CHUNK_SIZE) {
        const chunk = toImport.slice(i, i + IMPORT_CHUNK_SIZE);
        const created = await entities.Client.bulkCreate(chunk);
        imported += created.length;
      }

      queryClient.invalidateQueries({ queryKey: ["clients"] });

      setSummary({
        total: rows.length,
        imported,
        duplicates: rows.filter((r) => r.status === "duplicate").length,
        invalid: rows.filter((r) => r.status === "invalid").length,
      });
      setStep("summary");
      toast.success(`Imported ${imported} client${imported === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error("Import failed", { description: err.message });
    } finally {
      setImporting(false);
    }
  };

  const newCount = rows.filter((r) => r.status === "new").length;
  const duplicateCount = rows.filter((r) => r.status === "duplicate").length;
  const invalidCount = rows.filter((r) => r.status === "invalid").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Clients</DialogTitle>
          <DialogDescription>
            Upload a CSV export from Square, Vagaro, Booksy, Mindbody, or this app.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center justify-center gap-4 py-12 border-2 border-dashed rounded-lg">
            <Upload className="w-10 h-10 text-gray-400" />
            <p className="text-sm text-gray-500 text-center max-w-sm">
              Select a CSV file to preview the clients before importing. Duplicates are
              detected by matching phone number or email against existing clients.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
              id="client-csv-input"
            />
            <Button onClick={() => fileInputRef.current?.click()}>
              <FileText className="w-4 h-4 mr-2" />
              Choose CSV File
            </Button>
          </div>
        )}

        {step === "preview" && (
          <>
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <span className="text-gray-500">{fileName}</span>
              <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                {newCount} new
              </Badge>
              <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                {duplicateCount} duplicate{duplicateCount === 1 ? "" : "s"}
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
                  {invalidCount} skipped (no name)
                </Badge>
              )}
            </div>

            <div className="flex-1 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Visits</TableHead>
                    <TableHead className="text-right">Spent</TableHead>
                    <TableHead>Last Visit</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, PREVIEW_LIMIT).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {r.status === "new" && (
                          <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">New</Badge>
                        )}
                        {r.status === "duplicate" && (
                          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">Duplicate</Badge>
                        )}
                        {r.status === "invalid" && (
                          <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">No name</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{r.name || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.email || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.phone || "—"}</TableCell>
                      <TableCell className="text-right">{r.total_visits}</TableCell>
                      <TableCell className="text-right">${r.total_spent.toFixed(2)}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.last_visit || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.staff_notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {rows.length > PREVIEW_LIMIT && (
              <p className="text-xs text-gray-500">
                Showing first {PREVIEW_LIMIT} of {rows.length} rows.
              </p>
            )}
          </>
        )}

        {step === "summary" && summary && (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <div className="text-center space-y-1">
              <p className="font-semibold text-lg">Import complete</p>
              <p className="text-sm text-gray-600">
                {summary.imported} imported, {summary.duplicates} skipped as duplicates
                {summary.invalid > 0 ? `, ${summary.invalid} skipped (missing name)` : ""}.
              </p>
              <p className="text-xs text-gray-400">{summary.total} rows in file</p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={reset} disabled={importing}>
                Choose Different File
              </Button>
              <Button onClick={handleImport} disabled={importing || newCount === 0}>
                {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Import {newCount} Client{newCount === 1 ? "" : "s"}
              </Button>
            </>
          )}
          {step === "summary" && (
            <Button onClick={() => handleClose(false)}>Done</Button>
          )}
          {step === "upload" && (
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
