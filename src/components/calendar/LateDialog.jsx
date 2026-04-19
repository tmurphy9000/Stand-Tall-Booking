import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export default function LateDialog({ open, booking, onClose, onConfirm }) {
  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            Mark as Late
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600 py-2">
          Mark <strong>{booking.client_name}</strong>'s appointment as late? This will be recorded on their client account.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
            onClick={() => { onConfirm(booking.id); onClose(); }}
          >
            Confirm Late
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}