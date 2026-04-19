import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, X } from "lucide-react";

export default function BarberAssistant({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8B9A7E] to-[#6B7A5E] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg">AI Assistant</DialogTitle>
                <p className="text-xs text-gray-500">Service recommendations, notes, and scheduling help</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex items-center justify-center text-center px-6">
          <div>
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-[#8B9A7E]/40" />
            <p className="text-sm font-medium text-gray-600 mb-2">AI Assistant Coming Soon</p>
            <p className="text-xs text-gray-400">
              The AI assistant requires a backend AI service to be configured.
              Connect a Supabase Edge Function with your preferred AI provider to enable this feature.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
