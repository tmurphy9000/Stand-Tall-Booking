import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, UserCheck, Trash2, User, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import NoShowDialog from "./NoShowDialog";

export default function BookingContextMenu({ booking, position, onClose, onAction }) {
  const [showCancel, setShowCancel] = useState(false);
  const [showNoShow, setShowNoShow] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  if (!booking) return null;

  const handleCancel = () => {
    onAction("cancel", booking.id, { cancel_reason: cancelReason });
    setShowCancel(false);
    setCancelReason("");
    onClose();
  };

  const handleNoShowConfirm = async (bookingId, options) => {
    await onAction("no_show", bookingId, options);
    setShowNoShow(false);
  };

  const actions = [
    { label: "Confirm", icon: CheckCircle, color: "text-blue-600", action: () => { onAction("confirm", booking.id); onClose(); }, show: booking.status === "scheduled" },
    { label: "Mark Arrived", icon: UserCheck, color: "text-green-600", action: () => { onAction("checked_in", booking.id); onClose(); }, show: booking.status === "confirmed" || booking.status === "scheduled" },
    { label: "Checkout", icon: CheckCircle, color: "text-[#8B9A7E]", action: () => { onAction("checkout", booking.id); onClose(); }, show: booking.status !== "cancelled" && booking.status !== "completed" && booking.status !== "no_show" },
    { label: "Mark as No-Show", icon: AlertCircle, color: "text-orange-500", action: () => setShowNoShow(true), show: booking.status === "scheduled" || booking.status === "confirmed" },
    { label: "Cancel", icon: XCircle, color: "text-red-500", action: () => setShowCancel(true), show: booking.status !== "cancelled" && booking.status !== "completed" },
  ].filter(a => a.show);

  return (
    <>
      {/* Context dropdown */}
      {!showCancel && !showNoShow && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[180px]"
          style={{ top: position.y, left: position.x }}
        >
          <div className="px-3 py-2 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-900">{booking.client_name}</p>
            <p className="text-[10px] text-gray-400">{booking.service_name} • {booking.start_time}</p>
          </div>
          {booking.client_id && (
            <Link
              to={`${createPageUrl("ClientDetails")}?id=${booking.client_id}`}
              onClick={onClose}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors border-b border-gray-50"
            >
              <User className="w-4 h-4 text-[#B0BFA4]" />
              <span className="text-sm">View Client</span>
            </Link>
          )}
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.action}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              <a.icon className={`w-4 h-4 ${a.color}`} />
              <span className="text-sm">{a.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Click outside overlay */}
      {!showCancel && !showNoShow && (
        <div className="fixed inset-0 z-40" onClick={onClose} />
      )}

      {/* Cancel dialog */}
      <Dialog open={showCancel} onOpenChange={() => { setShowCancel(false); onClose(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">Cancel {booking.client_name}'s appointment?</p>
          <Textarea
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            placeholder="Reason (optional)"
            rows={2}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCancel(false); onClose(); }}>
              Keep
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              Cancel Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* No-Show dialog */}
      <NoShowDialog
        open={showNoShow}
        booking={booking}
        onClose={() => { setShowNoShow(false); onClose(); }}
        onConfirm={handleNoShowConfirm}
      />
    </>
  );
}