import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";

export default function InviteBarberForm({ open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    role: "service_provider",
    drivers_license_number: "",
    ssn: "",
    bank_name: "",
    account_number: "",
    routing_number: "",
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.email || !form.full_name) {
      toast.error("Full name and email are required");
      return;
    }

    setLoading(true);
    try {
      await base44.users.inviteUser(form.email, "user");

      // Store payroll/sensitive info using email as temp barber_id until linked
      await base44.entities.BarberSensitiveInfo.create({
        barber_id: form.email,
        full_legal_name: form.full_name,
        drivers_license_number: form.drivers_license_number,
        ssn: form.ssn,
        bank_name: form.bank_name,
        account_number: form.account_number,
        routing_number: form.routing_number,
      });

      toast.success(`Invitation sent to ${form.email}. They will receive an email to set their password.`);
      setForm({ full_name: "", email: "", role: "service_provider", drivers_license_number: "", ssn: "", bank_name: "", account_number: "", routing_number: "" });
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite New Barber</DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            They'll receive an email to set their password and access the app.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-gray-500">Full Name *</Label>
            <Input
              value={form.full_name}
              onChange={e => set("full_name", e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div>
            <Label className="text-xs text-gray-500">Email (Login Username) *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => set("email", e.target.value)}
              placeholder="barber@example.com"
            />
          </div>

          <div>
            <Label className="text-xs text-gray-500">Role</Label>
            <Select value={form.role} onValueChange={v => set("role", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="service_provider">Service Provider (Barber)</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[#B0BFA4] hover:bg-[#8B9A7E] text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}