import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { base44 } from "@/api/supabaseClient";
import { toast } from "sonner";

export default function NoShowDialog({ open, booking, onClose, onConfirm }) {
  const [addToHistory, setAddToHistory] = useState(true);
  const [notifyClient, setNotifyClient] = useState(true);

  const handleConfirm = async () => {
    try {
      // Mark booking as no-show
      await onConfirm(booking.id, { addToHistory, notifyClient });

      // Send notification if toggle is on
      if (notifyClient && booking.client_email) {
        await base44.integrations.Core.SendEmail({
          to: booking.client_email,
          subject: "Appointment No-Show Notification",
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Appointment No-Show</h2>
              <p>Hello ${booking.client_name},</p>
              <p>Your appointment scheduled for <strong>${booking.date}</strong> at <strong>${booking.start_time}</strong> has been marked as a no-show${addToHistory ? ' and added to your appointment history' : ''}.</p>
              <p>If you have any questions or concerns, please contact us:</p>
              <p style="font-size: 18px; font-weight: bold; color: #8B9A7E;">📞 728-289-1010</p>
              <p>Thank you,<br>Stand Tall Barbershop</p>
            </div>
          `
        });
        toast.success("No-show notification sent");
      }

      onClose();
    } catch (error) {
      toast.error("Failed to process no-show");
      console.error(error);
    }
  };

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Mark as No-Show
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-600">
            Mark <strong>{booking.client_name}</strong>'s appointment as a no-show?
          </p>
          
          <div className="space-y-3 border-t pt-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="add-history" className="text-sm cursor-pointer">
                Add no-show to client's appointment history
              </Label>
              <Switch
                id="add-history"
                checked={addToHistory}
                onCheckedChange={setAddToHistory}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notify-client" className="text-sm cursor-pointer">
                Notify client
              </Label>
              <Switch
                id="notify-client"
                checked={notifyClient}
                onCheckedChange={setNotifyClient}
              />
            </div>

            {notifyClient && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-gray-600">
                <p className="mb-1">Client will be notified via email:</p>
                <p className="font-mono text-blue-700">{booking.client_email || "No email on file"}</p>
                <p className="mt-2">Shop contact: <strong>728-289-1010</strong></p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleConfirm}
          >
            Confirm No-Show
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}