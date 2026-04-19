import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText } from "lucide-react";

export default function TermsAndConditions() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left text-white/60 hover:text-white hover:bg-white/10 w-full"
      >
        <FileText className="w-4 h-4 flex-shrink-0" />
        STB Terms & Conditions
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>STB Terms & Conditions</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-600 space-y-3 mt-2">
            <p>Legal disclaimer content will be added here.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}