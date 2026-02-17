import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";

export default function InviteBarberForm({ open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    full_legal_name: "",
    drivers_license_number: "",
    ssn: "",
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.email || !form.full_legal_name || !form.drivers_license_number || !form.ssn) {
      toast.error("All fields are required");
      return;
    }

    setLoading(true);
    try {
      // First invite the user via email
      await base44.users.inviteUser(form.email, "user");
      
      // Store sensitive info temporarily - it will be linked to barber after account creation
      await base44.entities.BarberSensitiveInfo.create({
        barber_id: form.email, // Use email as temp ID until barber account is created
        full_legal_name: form.full_legal_name,
        drivers_license_number: form.drivers_license_number,
        ssn: form.ssn,
      });

      toast.success(`Invitation sent to ${form.email}`);
      setForm({ email: "", full_legal_name: "", drivers_license_number: "", ssn: "" });
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
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-gray-500">Email Address *</Label>
            <Input 
              type="email"
              value={form.email} 
              onChange={e => set("email", e.target.value)}
              placeholder="barber@example.com" 
            />
          </div>

          <div>
            <Label className="text-xs text-gray-500">Full Legal Name *</Label>
            <Input 
              value={form.full_legal_name} 
              onChange={e => set("full_legal_name", e.target.value)}
              placeholder="John Michael Doe" 
            />
          </div>

          <div>
            <Label className="text-xs text-gray-500">Driver's License Number *</Label>
            <Input 
              value={form.drivers_license_number} 
              onChange={e => set("drivers_license_number", e.target.value)}
              placeholder="D1234567" 
            />
          </div>

          <div>
            <Label className="text-xs text-gray-500">Social Security Number *</Label>
            <Input 
              type="password"
              value={form.ssn} 
              onChange={e => set("ssn", e.target.value)}
              placeholder="XXX-XX-XXXX" 
              maxLength={11}
            />
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