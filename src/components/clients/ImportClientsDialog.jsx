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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  parseClientImportCSV,
  normalizePhone,
  normalizeEmail,
  mapRowToClient,
  MAPPABLE_FIELDS,
} from "@/lib/clientCsv";
import { extractPdfTable, parsePdfTable } from "@/lib/clientPdf";
import { supabase } from "@/lib/supabaseClient";

const PREVIEW_LIMIT = 50;
const IMPORT_CHUNK_SIZE = 200;
const MAX_MAP_COLUMNS = 8;
const IMPORT_CLIENTS_FUNCTION_URL =
  "https://mmmkachplbkaxvhauhaa.supabase.co/functions/v1/import-clients";

export default function ImportClientsDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState("upload"); // upload | pdf-map | preview | summary
  const [fileName, setFileName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [rows, setRows] = useState([]); // parsed + annotated rows
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState(null);

  // Full extracted PDF data, kept around so the user can switch to manual mapping
  const [pdfLines, setPdfLines] = useState([]);
  const [pdfTableRows, setPdfTableRows] = useState([]);
  const [pdfColumnMap, setPdfColumnMap] = useState(null);
  const [pdfHeaderIndex, setPdfHeaderIndex] = useState(-1);

  // State for the manual column-mapping step
  const [mappingRows, setMappingRows] = useState([]);
  const [hasHeaderRow, setHasHeaderRow] = useState(false);
  const [columnMapping, setColumnMapping] = useState([]);

  const { data: existingClients = [] } = useQuery({
    queryKey: ["clients", "all-for-import"],
    queryFn: () => entities.Client.list(),
    enabled: open,
  });

  const reset = () => {
    setStep("upload");
    setFileName("");
    setProcessing(false);
    setRows([]);
    setImporting(false);
    setSummary(null);
    setPdfLines([]);
    setPdfTableRows([]);
    setPdfColumnMap(null);
    setPdfHeaderIndex(-1);
    setMappingRows([]);
    setHasHeaderRow(false);
    setColumnMapping([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (next) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const annotateClients = (clients) => {
    const existingPhones = new Set(
      existingClients.map((c) => normalizePhone(c.phone)).filter(Boolean)
    );
    const existingEmails = new Set(
      existingClients.map((c) => normalizeEmail(c.email)).filter(Boolean)
    );
    const seenPhones = new Set();
    const seenEmails = new Set();

    return clients.map((c) => {
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
  };

  const goToPreview = (clients) => {
    if (clients.length === 0) {
      toast.error("No client rows found in that file.");
      return;
    }
    setRows(annotateClients(clients));
    setStep("preview");
  };

  const handleCSVFile = async (file) => {
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

    goToPreview(clients);
  };

  const handlePDFFile = async (file) => {
    const { lines, tableRows } = await extractPdfTable(file);
    if (lines.length === 0) {
      toast.error("Couldn't extract any text from that PDF.");
      return;
    }

    setPdfLines(lines);
    setPdfTableRows(tableRows);

    const result = parsePdfTable({ lines, tableRows });
    if (result.mode === "structured") {
      setPdfColumnMap(result.columnMap);
      setPdfHeaderIndex(result.headerIndex);
      goToPreview(result.clients);
      return;
    }

    setPdfColumnMap(null);
    setPdfHeaderIndex(-1);

    if (result.mode === "pattern") {
      goToPreview(result.clients);
      return;
    }

    // mode === "raw": let the user manually map columns
    enterManualMapping(tableRows, null);
  };

  // Opens the manual column-mapping step. `rows` are the table rows to map (full extraction,
  // or sliced to start at a detected header row); `columnMap` pre-fills the dropdowns when
  // remapping a previously auto-detected table.
  const enterManualMapping = (rows, columnMap) => {
    const maxCols = Math.min(MAX_MAP_COLUMNS, Math.max(1, ...rows.map((r) => r.length)));
    const mapping = Array.from({ length: maxCols }, () => "skip");
    if (columnMap) {
      for (const [field, idx] of Object.entries(columnMap)) {
        if (idx < maxCols) mapping[idx] = field;
      }
    }
    setMappingRows(rows);
    setColumnMapping(mapping);
    setHasHeaderRow(!!columnMap);
    setStep("pdf-map");
  };

  const handleManualMapping = () => {
    const rows = pdfHeaderIndex >= 0 ? pdfTableRows.slice(pdfHeaderIndex) : pdfTableRows;
    enterManualMapping(rows, pdfColumnMap);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setProcessing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(IMPORT_CLIENTS_FUNCTION_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Failed to import clients");
      }

      const clients = (result.clients || []).map((c) => ({
        name: c.name || "",
        email: c.email || "",
        phone: c.phone || "",
        total_visits: 0,
        total_spent: 0,
        last_visit: "",
        staff_notes: "",
      }));

      goToPreview(clients);
    } catch (err) {
      toast.error("Failed to read file", { description: err.message });
    } finally {
      setProcessing(false);
    }
  };

  const handlePdfMapContinue = () => {
    const columnMap = {};
    columnMapping.forEach((field, idx) => {
      if (field !== "skip") columnMap[field] = idx;
    });

    if (Object.keys(columnMap).length === 0) {
      toast.error("Map at least one column before continuing.");
      return;
    }

    const dataRows = hasHeaderRow ? mappingRows.slice(1) : mappingRows;
    const clients = dataRows
      .map((row) => mapRowToClient(row, columnMap))
      .filter((c) => c.name || c.email || c.phone);

    goToPreview(clients);
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
            Upload a CSV or PDF export from Square, Vagaro, Booksy, Mindbody, or this app.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center justify-center gap-4 py-12 border-2 border-dashed rounded-lg">
            {processing ? (
              <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
            ) : (
              <Upload className="w-10 h-10 text-gray-400" />
            )}
            <p className="text-sm text-gray-500 text-center max-w-sm">
              {processing
                ? `Reading ${fileName}...`
                : "Select a CSV or PDF file to preview the clients before importing. Duplicates are detected by matching phone number or email against existing clients."}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,.pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
              id="client-import-input"
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={processing}>
              <FileText className="w-4 h-4 mr-2" />
              Choose File
            </Button>
          </div>
        )}

        {step === "pdf-map" && (
          <>
            <div className="text-sm text-gray-600">
              <p className="mb-2">
                Use the dropdowns below to tell us what each column from{" "}
                <span className="font-medium">{fileName}</span> contains, then continue.
              </p>
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  id="has-header-row"
                  checked={hasHeaderRow}
                  onCheckedChange={(v) => setHasHeaderRow(!!v)}
                />
                <Label htmlFor="has-header-row" className="text-sm font-normal cursor-pointer">
                  First row is a header (skip it)
                </Label>
              </div>
            </div>

            <div className="flex-1 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columnMapping.map((value, colIdx) => (
                      <TableHead key={colIdx} className="min-w-[150px]">
                        <Select
                          value={value}
                          onValueChange={(field) =>
                            setColumnMapping((prev) => prev.map((v, i) => (i === colIdx ? field : v)))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skip">Ignore</SelectItem>
                            {MAPPABLE_FIELDS.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappingRows.slice(0, PREVIEW_LIMIT).map((row, i) => (
                    <TableRow key={i} className={hasHeaderRow && i === 0 ? "opacity-40" : ""}>
                      {columnMapping.map((_, colIdx) => (
                        <TableCell key={colIdx} className="max-w-[180px] truncate">
                          {row[colIdx] || "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {mappingRows.length > PREVIEW_LIMIT && (
              <p className="text-xs text-gray-500">
                Showing first {PREVIEW_LIMIT} of {mappingRows.length} rows.
              </p>
            )}

            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer select-none">View raw extracted text</summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap bg-gray-50 border rounded p-2">
                {pdfLines.join("\n")}
              </pre>
            </details>
          </>
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
          {step === "pdf-map" && (
            <>
              <Button variant="outline" onClick={reset}>
                Choose Different File
              </Button>
              <Button onClick={handlePdfMapContinue}>Continue</Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={reset} disabled={importing}>
                Choose Different File
              </Button>
              {pdfTableRows.length > 0 && (
                <Button variant="outline" onClick={handleManualMapping} disabled={importing}>
                  Manual Column Mapping
                </Button>
              )}
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
            <Button variant="outline" onClick={() => handleClose(false)} disabled={processing}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
