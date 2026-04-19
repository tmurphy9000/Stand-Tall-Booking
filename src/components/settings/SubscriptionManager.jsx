import React, { useState } from "react";
import { Check, X, AlertTriangle, CreditCard, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

const CORE_FEATURES = [
  { name: "Booking Calendar", description: "Full appointment scheduling & management", included: true },
  { name: "Client Management", description: "Client profiles, history & notes", included: true },
  { name: "Checkout & POS", description: "Payments, discounts, tips & receipts", included: true },
  { name: "Inventory Management", description: "Product tracking & stock control", included: true },
  { name: "Staff Management", description: "Barber profiles, hours & permissions", included: true },
  { name: "Reports & Analytics", description: "Sales, commissions & performance data", included: true },
  { name: "Cash Tracker", description: "Cash flow monitoring & withdrawals", included: true },
  { name: "Online Client Booking", description: "Public-facing booking widget for clients", included: true },
  { name: "Role-Based Access Control", description: "Permission levels per staff member", included: true },
  { name: "Review Collection", description: "Post-visit client review prompts", included: true },
];

const ADDON_FEATURES = [
  {
    name: "Payroll Management",
    description: "Staff payroll records, banking info & Gusto integration",
    status: "active",
    price: "TBD",
  },
  {
    name: "Call-Off Notifications",
    description: "Email clients when a barber calls out",
    status: "active",
    price: "TBD",
  },
  {
    name: "Email & Text Marketing",
    description: "Broadcast campaigns to your client list",
    status: "coming_soon",
    price: "TBD",
  },
];

export default function SubscriptionManager() {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelConfirmText, setCancelConfirmText] = useState("");

  const handleCancel = () => {
    // Placeholder — wire to billing provider when ready
    alert("Please contact support to cancel your subscription.");
    setShowCancelDialog(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Manage Subscription</h2>
        <p className="text-sm text-gray-500 mt-1">View your current plan and active features.</p>
      </div>

      {/* Current Plan Card */}
      <div className="bg-[#0A0A0A] rounded-xl p-5 text-white flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold">Stand Tall Pro</span>
            <Badge className="bg-[#8B9A7E] text-white border-0 text-xs">Active</Badge>
          </div>
          <p className="text-white/60 text-sm">Full-featured barbershop management platform</p>
        </div>
        <CreditCard className="w-8 h-8 text-white/30" />
      </div>

      {/* Core Features Table */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Included in Your Plan</p>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Feature</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {CORE_FEATURES.map((f, i) => (
                <tr key={f.name} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-4 py-3 font-medium text-gray-800">{f.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{f.description}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
                      <Check className="w-3 h-3 text-green-600" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add-On Features Table */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Add-On Features</p>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Feature</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price/mo</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {ADDON_FEATURES.map((f, i) => (
                <tr key={f.name} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-4 py-3 font-medium text-gray-800">{f.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{f.description}</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-400 font-medium">{f.price}</td>
                  <td className="px-4 py-3 text-center">
                    {f.status === "active" ? (
                      <Badge className="bg-green-100 text-green-700 border-0 text-xs">Active</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-500 border-0 text-xs">Coming Soon</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">* Add-on pricing to be announced. Currently included at no extra charge.</p>
      </div>

      {/* Cancel */}
      <div className="border border-red-100 bg-red-50 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-red-700">Cancel Subscription</p>
          <p className="text-xs text-red-500 mt-0.5">Your account will remain active until the end of the billing period.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-red-300 text-red-600 hover:bg-red-100 hover:border-red-400"
          onClick={() => setShowCancelDialog(true)}
        >
          Cancel Plan
        </Button>
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Cancel Subscription?
            </DialogTitle>
            <DialogDescription>
              This will end your Stand Tall Pro plan at the end of the current billing period. All your data will be preserved but you'll lose access to the platform.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            To confirm, please contact our support team or type <strong>CANCEL</strong> below.
          </p>
          <input
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm mt-1"
            placeholder="Type CANCEL to confirm"
            value={cancelConfirmText}
            onChange={e => setCancelConfirmText(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCancelDialog(false); setCancelConfirmText(""); }}>
              Keep Plan
            </Button>
            <Button
              variant="destructive"
              disabled={cancelConfirmText !== "CANCEL"}
              onClick={handleCancel}
            >
              Confirm Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}