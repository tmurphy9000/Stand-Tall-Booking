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
const POLL_INTERVAL_MS = 3000;

export default function ImportClientsDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const cancelledRef = useRef(false);
  const pollIntervalRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [job, setJob] = useState(null); // { id, status, imported_clients, last_chunk, total_chars, error }
  const [progress, setProgress] = useState(0);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const pollJob = async (jobId) => {
    const { data, error } = await supabase
      .from("client_imports")
      .select("*")
      .eq("id", jobId)
      .single();

    if (cancelledRef.current || error || !data) return;

    setJob(data);

    if (data.status === "done") {
      stopPolling();
      const count = data.imported_clients || 0;
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success(`Imported ${count} client${count === 1 ? "" : "s"}`);
      handleClose(false);
    } else if (data.status === "failed") {
      stopPolling();
    }
  };

  const startPolling = (jobId) => {
    stopPolling();
    pollJob(jobId);
    pollIntervalRef.current = setInterval(() => pollJob(jobId), POLL_INTERVAL_MS);
  };

  const runImport = (jobId) => {
    supabase.functions.invoke("process-client-import", { body: { job_id: jobId } }).catch(async (err) => {
      await supabase
        .from("client_imports")
        .update({ status: "failed", error: err?.message || "Failed to start import", updated_at: new Date().toISOString() })
        .eq("id", jobId);
    });
    startPolling(jobId);
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
        runImport(data.id);
      }
    };

    checkExistingJob();
  }, [open]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      stopPolling();
    };
  }, []);

  useEffect(() => {
    if (job?.total_chars) {
      setProgress(Math.min(100, Math.round(((job.last_chunk || 0) / job.total_chars) * 100)));
    }
  }, [job?.last_chunk, job?.total_chars]);

  const reset = () => {
    cancelledRef.current = true;
    stopPolling();
    setFileName("");
    setUploading(false);
    setChecking(false);
    setJob(null);
    setProgress(0);
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
      runImport(importJob.id);
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
          <DialogTitle>Import Clients</DialogTitle>
          <DialogDescription>
            Upload a CSV or PDF export from Square, Vagaro, Booksy, Mindbody, or this app. Clients
            are extracted and imported automatically in the background.
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
              Large files may take a few minutes to process. You can safely close this window —
              the import will continue in the background.
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
