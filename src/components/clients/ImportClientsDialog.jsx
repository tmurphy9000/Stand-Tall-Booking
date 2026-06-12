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
  const pollRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [job, setJob] = useState(null); // { id, status, total_clients, imported_clients, error }

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => stopPolling, []);

  const reset = () => {
    stopPolling();
    setFileName("");
    setUploading(false);
    setJob(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (next) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const pollJob = (jobId) => {
    pollRef.current = setInterval(async () => {
      const { data, error } = await supabase
        .from("client_imports")
        .select("*")
        .eq("id", jobId)
        .single();

      if (error) return;

      setJob(data);

      if (data.status === "done") {
        stopPolling();
        queryClient.invalidateQueries({ queryKey: ["clients"] });
        toast.success(`Imported ${data.imported_clients} client${data.imported_clients === 1 ? "" : "s"}`);
        handleClose(false);
      } else if (data.status === "failed") {
        stopPolling();
      }
    }, POLL_INTERVAL_MS);
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
      pollJob(importJob.id);

      supabase.functions.invoke("process-client-import", { body: { id: importJob.id } });
    } catch (err) {
      toast.error("Failed to start import", { description: err.message });
      reset();
    } finally {
      setUploading(false);
    }
  };

  const progress = job?.total_clients
    ? Math.min(100, Math.round((job.imported_clients / job.total_clients) * 100))
    : 0;

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
            <div className="w-full space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-gray-500 text-center">
                {job.total_clients > 0
                  ? `Importing ${job.imported_clients} of ${job.total_clients} clients...`
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
