import React, { useState, useRef, useLayoutEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, UserCheck, Trash2, User, AlertCircle, Clock, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import NoShowDialog from "./NoShowDialog";
import LateDialog from "./LateDialog";
import { format } from "date-fns";

export default function BookingContextMenu({ booking, position, onClose, onAction }) {
  const [showCancel, setShowCancel] = useState(false);
  const [showNoShow, setShowNoShow] = useState(false);
  const [showLate, setShowLate] = useState(false);
  const [showDeleteBlock, setShowDeleteBlock] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const menuRef = useRef(null);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.bottom > window.innerHeight - 8) {
      el.style.top = `${Math.max(8, window.innerHeight - rect.height - 8)}px`;
    }
    if (rect.right > window.innerWidth - 8) {
      el.style.left = `${Math.max(8, window.innerWidth - rect.width - 8)}px`;
    }
  }, [position.x, position.y]);

  const isBlock = booking?.client_name === "BLOCKED TIME";


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

  const handleLateConfirm = async (bookingId) => {
    await onAction("late", bookingId);
  };

  const actions = [
    { label: "Confirm", icon: CheckCircle, color: "text-blue-600", action: () => { onAction("confirm", booking.id); onClose(); }, show: !isBlock && booking.status === "scheduled" },
    { label: "Mark Arrived", icon: UserCheck, color: "text-green-600", action: () => { onAction("checked_in", booking.id); onClose(); }, show: !isBlock && (booking.status === "confirmed" || booking.status === "scheduled") },
    { label: "Checkout", icon: CheckCircle, color: "text-[#8B9A7E]", action: () => { onAction("checkout", booking.id); onClose(); }, show: !isBlock && booking.status !== "cancelled" && booking.status !== "completed" && booking.status !== "no_show" },
    { label: "Mark as No-Show", icon: AlertCircle, color: "text-orange-500", action: () => setShowNoShow(true), show: !isBlock && (booking.status === "scheduled" || booking.status === "confirmed" || booking.status === "checked_in") },
    { label: "Mark as Late", icon: Clock, color: "text-yellow-500", action: () => setShowLate(true), show: !isBlock && (booking.status === "scheduled" || booking.status === "confirmed" || booking.status === "checked_in") },
    { label: "Cancel", icon: XCircle, color: "text-red-500", action: () => setShowCancel(true), show: !isBlock && booking.status !== "cancelled" && booking.status !== "completed" },
    { label: "Delete Block", icon: Trash2, color: "text-red-500", action: () => setShowDeleteBlock(true), show: isBlock },
  ].filter(a => a.show);

  return (
    <>
      {/* Context dropdown */}
      {!showCancel && !showNoShow && !showLate && !showDeleteBlock && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[180px]"
          style={{ top: position.y, left: position.x }}
        >
          <div className="px-3 py-2 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-900">{booking.client_name}</p>
            <p className="text-[10px] text-gray-400">{booking.service_name} • {booking.start_time}</p>
            {booking.deposit_amount_paid > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <DollarSign className="w-3 h-3" style={{ color: "#16a34a" }} />
                <span className="text-[10px] font-medium" style={{ color: "#16a34a" }}>
                  Deposit paid: ${(booking.deposit_amount_paid / 100).toFixed(2)}
                </span>
              </div>
            )}
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
      {!showCancel && !showNoShow && !showLate && !showDeleteBlock && (
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

      {/* Late dialog */}
      <LateDialog
        open={showLate}
        booking={booking}
        onClose={() => { setShowLate(false); onClose(); }}
        onConfirm={handleLateConfirm}
      />

      {/* Delete Block dialog */}
      <Dialog open={showDeleteBlock} onOpenChange={() => { setShowDeleteBlock(false); onClose(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Delete Blocked Time</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-1">
            <p className="text-sm text-gray-600">
              {booking?.barber_name} — {booking?.start_time}{booking?.end_time ? ` to ${booking.end_time}` : ""} on{" "}
              {booking?.date ? format(new Date(booking.date + "T12:00:00"), "MMM d, yyyy") : ""}
            </p>
            {booking?.repeat_group_id && (
              <p className="text-xs text-orange-600">This block is part of a recurring series.</p>
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {booking?.repeat_group_id && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  onAction("delete_block_all", booking.id, { repeat_group_id: booking.repeat_group_id });
                  setShowDeleteBlock(false);
                  onClose();
                }}
              >
                Delete All Recurring Blocks
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => {
                onAction("delete_block_one", booking.id);
                setShowDeleteBlock(false);
                onClose();
              }}
            >
              Delete Just This Block
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => { setShowDeleteBlock(false); onClose(); }}>
              Keep Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}