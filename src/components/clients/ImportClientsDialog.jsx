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
import { Loader2, Upload, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

const DEFAULT_SHOP_ID = "00000000-0000-0000-0000-000000000001";
const CHUNK_CHARS = 50000;

export default function ImportClientsDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const cancelledRef = useRef(false);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [job, setJob] = useState(null); // { id, status, imported_clients, error }
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const reset = () => {
    cancelledRef.current = true;
    setFileName("");
    setUploading(false);
    setJob(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (next) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const getErrorMessage = async (error) => {
    if (error?.context?.json) {
      try {
        const body = await error.context.json();
        if (body?.error) return body.error;
      } catch {
        // fall through to generic message below
      }
    }
    return error?.message || "Something went wrong while importing this file.";
  };

  const processImport = async (jobId, fileSize) => {
    let chunkStart = 0;
    let chunkEnd = CHUNK_CHARS;
    let importedCount = 0;

    while (!cancelledRef.current) {
      const { data, error } = await supabase.functions.invoke("process-client-import", {
        body: { job_id: jobId, chunk_start: chunkStart, chunk_end: chunkEnd },
      });

      if (cancelledRef.current) return;

      if (error) {
        const message = await getErrorMessage(error);
        setJob((prev) => ({ ...prev, status: "failed", error: message }));
        return;
      }

      importedCount += data.clients_found;
      setJob((prev) => ({
        ...prev,
        status: data.done ? "done" : "processing",
        imported_clients: importedCount,
      }));
      setProgress(Math.min(100, Math.round((chunkEnd / fileSize) * 100)));

      if (data.done) {
        queryClient.invalidateQueries({ queryKey: ["clients"] });
        toast.success(`Imported ${importedCount} client${importedCount === 1 ? "" : "s"}`);
        handleClose(false);
        return;
      }

      chunkStart = data.next_chunk_start;
      chunkEnd = data.next_chunk_end;
    }
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
      processImport(importJob.id, file.size);
    } catch (err) {
      toast.error("Failed to start import", { description: err.message });
      reset();
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Clients</DialogTitle>
          <DialogDescription>
            Upload a CSV or PDF export from Square, Vagaro, Booksy, Mindbody, or this app. Clients
            are extracted and imported automatically in the background.
          </DialogDescription>
        </DialogHeader>

        {!job && (
          <div className="flex flex-col items-center justify-center gap-4 py-12 border-2 border-dashed rounded-lg">
            {uploading ? (
              <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
            ) : (
              <Upload className="w-10 h-10 text-gray-400" />
            )}
            <p className="text-sm text-gray-500 text-center max-w-sm">
              {uploading ? `Uploading ${fileName}...` : "Select a CSV or PDF file to import."}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,.pdf,application/pdf"
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
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
            <p className="text-sm text-gray-500 text-center max-w-sm">
              Large files may take a few minutes to process. Please keep this window open.
            </p>
            <div className="w-full space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-gray-500 text-center">
                {job.imported_clients > 0
                  ? `Imported ${job.imported_clients} client${job.imported_clients === 1 ? "" : "s"} so far...`
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
