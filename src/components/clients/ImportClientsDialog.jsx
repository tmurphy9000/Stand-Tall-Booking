import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Upload, FileText, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

const DEFAULT_SHOP_ID = "00000000-0000-0000-0000-000000000001";
const CHUNK_SIZE = 100000;

export default function ImportClientsDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const cancelledRef = useRef(false);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [job, setJob] = useState(null); // { id, status, error }
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);

  const runChunkLoop = async (jobId, startChunk, startEnd, startImported) => {
    setProcessing(true);
    let chunkStart = startChunk;
    let chunkEnd = startEnd;
    let imported = startImported;

    try {
      while (true) {
        if (cancelledRef.current) return;

        const { data, error } = await supabase.functions.invoke("process-client-import", {
          body: { job_id: jobId, chunk_start: chunkStart, chunk_end: chunkEnd },
        });

        if (cancelledRef.current) return;
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        imported += data.clients_found || 0;
        setImportedCount(imported);
        if (data.total_length) {
          setProgress(Math.min(100, Math.round((data.next_chunk_start / data.total_length) * 100)));
        }

        if (data.done) break;

        chunkStart = data.next_chunk_start;
        chunkEnd = data.next_chunk_end;
      }

      if (cancelledRef.current) return;
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success(`Imported ${imported} client${imported === 1 ? "" : "s"}`);
      handleClose(false);
    } catch (err) {
      if (cancelledRef.current) return;
      const message = err?.message || "Import failed";
      await supabase
        .from("client_imports")
        .update({ status: "failed", error: message, updated_at: new Date().toISOString() })
        .eq("id", jobId);
      setJob((prev) => (prev ? { ...prev, status: "failed", error: message } : prev));
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    cancelledRef.current = false;

    const checkExistingJob = async () => {
      setChecking(true);
      const { data, error } = await supabase
        .from("client_imports")
        .select("*")
        .eq("shop_id", DEFAULT_SHOP_ID)
        .in("status", ["pending", "processing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelledRef.current) return;
      setChecking(false);

      if (!error && data) {
        setJob(data);
        const lastChunk = data.last_chunk || 0;
        setImportedCount(data.imported_clients || 0);
        if (data.total_chars) {
          setProgress(Math.min(100, Math.round((lastChunk / data.total_chars) * 100)));
        }
        runChunkLoop(data.id, lastChunk, lastChunk + CHUNK_SIZE, data.imported_clients || 0);
      }
    };

    checkExistingJob();
  }, [open]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const reset = () => {
    cancelledRef.current = true;
    setFileName("");
    setUploading(false);
    setChecking(false);
    setProcessing(false);
    setJob(null);
    setProgress(0);
    setImportedCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (next) => {
    if (!next) {
      reset();
    }
    onOpenChange(next);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploading(true);
    try {
      const path = `${DEFAULT_SHOP_ID}/${crypto.randomUUID()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("client-imports")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: importJob, error: insertError } = await supabase
        .from("client_imports")
        .insert({
          shop_id: DEFAULT_SHOP_ID,
          file_path: path,
          file_name: file.name,
          status: "pending",
        })
        .select()
        .single();
      if (insertError) throw insertError;

      setJob(importJob);
      setUploading(false);

      cancelledRef.current = false;
      runChunkLoop(importJob.id, 0, CHUNK_SIZE, 0);
    } catch (err) {
      toast.error("Failed to start import", { description: err.message });
      reset();
      setUploading(false);
    }
  };

  const showUpload = !job && !checking;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Import Clients</DialogTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label="Supported platforms"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium">Supported platforms:</p>
                  <p>
                    Vagaro, Square, Booksy, GlossGenius, Fresha, Squire, StyleSeat, Mindbody,
                    DaySmart, Boulevard
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <DialogDescription>
            Upload a CSV, Excel, or PDF export from Square, Vagaro, Booksy, Mindbody, or this app.
            Clients are extracted and imported automatically.
          </DialogDescription>
        </DialogHeader>

        {checking && (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
          </div>
        )}

        {showUpload && (
          <div className="flex flex-col items-center justify-center gap-4 py-12 border-2 border-dashed rounded-lg">
            {uploading ? (
              <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
            ) : (
              <Upload className="w-10 h-10 text-gray-400" />
            )}
            <p className="text-sm text-gray-500 text-center max-w-sm">
              {uploading ? `Uploading ${fileName}...` : "Select a CSV, Excel, or PDF file to import."}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,.pdf,application/pdf,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              className="hidden"
              id="client-import-input"
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <FileText className="w-4 h-4 mr-2" />
              Choose File
            </Button>
          </div>
        )}

        {job && job.status !== "failed" && (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
            <p className="text-sm text-gray-500 text-center max-w-sm">
              Large files may take a few minutes to process. Feel free to leave this open in the
              background while we work through it.
            </p>
            <div className="w-full space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-gray-500 text-center">
                {importedCount > 0
                  ? `Imported ${importedCount} client${importedCount === 1 ? "" : "s"} so far...`
                  : "Reading file and extracting clients..."}
              </p>
            </div>
          </div>
        )}

        {job && job.status === "failed" && (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <p className="text-sm text-gray-600 text-center max-w-sm">
              {job.error || "Something went wrong while importing this file."}
            </p>
          </div>
        )}

        <DialogFooter>
          {(!job || job.status === "failed") && (
            <Button variant="outline" onClick={() => handleClose(false)} disabled={uploading}>
              {job?.status === "failed" ? "Close" : "Cancel"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
