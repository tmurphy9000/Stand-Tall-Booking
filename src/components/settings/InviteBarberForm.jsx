import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/supabaseClient";
import { toast } from "sonner";
import { Mail, Loader2, ClipboardEdit, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  role: "service_provider",
  temp_password: "",
};

const EMPTY_PAYROLL = {
  drivers_license_number: "",
  ssn: "",
  bank_name: "",
  account_number: "",
  routing_number: "",
};

export default function InviteBarberForm({ open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [payrollEntry, setPayrollEntry] = useState("send"); // "manual" | "send"
  const [payroll, setPayroll] = useState(EMPTY_PAYROLL);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const setP = (k, v) => setPayroll(prev => ({ ...prev, [k]: v }));

  const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();

  const handleSubmit = async () => {
    if (!form.email || !form.first_name || !form.last_name || !form.temp_password) {
      toast.error("First name, last name, email, and temporary password are required");
      return;
    }

    setLoading(true);
    try {
      // Invite to app
      await base44.users.inviteUser(form.email, "user");

      // Create barber profile
      const barberResult = await base44.entities.Barber.create({
        name: fullName,
        email: form.email,
        phone: form.phone,
        permission_level: form.role,
        is_active: true,
        online_bookable: true,
      });

      // Create password record with temp password
      const hashPassword = (pwd) => btoa(pwd); // Simple base64 for demo
      await base44.asServiceRole.entities.BarberPassword.create({
        barber_id: barberResult.id,
        email: form.email,
        password_hash: hashPassword(form.temp_password),
        is_temp: true,
      });

      // Sync existing barber records by name match and update with user_id
      await base44.functions.invoke("syncBarberAccounts", {
        barber_name: fullName,
        user_id: barberResult.id,
        email: form.email,
      });

      if (payrollEntry === "manual") {
        // Save sensitive info directly
        await base44.entities.BarberSensitiveInfo.create({
          barber_id: form.email,
          full_legal_name: fullName,
          drivers_license_number: payroll.drivers_license_number,
          ssn: payroll.ssn,
          bank_name: payroll.bank_name,
          account_number: payroll.account_number,
          routing_number: payroll.routing_number,
        });
        toast.success(`${fullName} added and payroll info saved.`);
      } else {
        // Send email with temporary password
        await base44.integrations.Core.SendEmail({
          to: form.email,
          subject: "Welcome to Stand Tall Barbershop — Your Login Details",
          body: `Hi ${form.first_name},\n\nWelcome to Stand Tall Barbershop! Your account has been created.\n\nTemporary Password: ${form.temp_password}\n\nPlease log in and change your password immediately. You'll also need to complete your payroll information (SSN, bank details, driver's license) so we can set you up on payroll.\n\nIf you have any questions, reach out to your manager.\n\nSee you soon!`,
        });
        toast.success(`${fullName} invited! Temporary password sent to ${form.email}.`);
      }

      setForm(EMPTY_FORM);
      setPayroll(EMPTY_PAYROLL);
      setPayrollEntry("send");
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.message || "Failed to invite barber");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite New Barber</DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            Fill in the basic info, then choose how to collect their payroll details.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Basic Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Basic Information</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500">First Name *</Label>
                <Input
                  value={form.first_name}
                  onChange={e => set("first_name", e.target.value)}
                  placeholder="John"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Last Name *</Label>
                <Input
                  value={form.last_name}
                  onChange={e => set("last_name", e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-500">Phone Number</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={e => set("phone", e.target.value)}
                placeholder="(555) 000-0000"
              />
            </div>

            <div>
              <Label className="text-xs text-gray-500">Email (Login) *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => set("email", e.target.value)}
                placeholder="barber@example.com"
              />
            </div>

            <div>
              <Label className="text-xs text-gray-500">Temporary Password *</Label>
              <Input
                type="password"
                value={form.temp_password}
                onChange={e => set("temp_password", e.target.value)}
                placeholder="Create a temporary password"
              />
              <p className="text-xs text-gray-400 mt-1">They'll be asked to change this on first login</p>
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
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payroll method choice */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Payroll & ID Information</p>
            <p className="text-xs text-gray-400">How would you like to collect SSN, banking, and license info?</p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPayrollEntry("send")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-sm font-medium transition-all",
                  payrollEntry === "send"
                    ? "border-[#8B9A7E] bg-[#8B9A7E]/10 text-[#6B7A5E]"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                )}
              >
                <Send className="w-5 h-5" />
                <span>Email the Barber</span>
                <span className="text-xs font-normal text-center">They fill it in themselves via email</span>
              </button>

              <button
                type="button"
                onClick={() => setPayrollEntry("manual")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-sm font-medium transition-all",
                  payrollEntry === "manual"
                    ? "border-[#8B9A7E] bg-[#8B9A7E]/10 text-[#6B7A5E]"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                )}
              >
                <ClipboardEdit className="w-5 h-5" />
                <span>Enter Manually</span>
                <span className="text-xs font-normal text-center">Enter their details right now</span>
              </button>
            </div>
          </div>

          {/* Manual payroll fields */}
          {payrollEntry === "manual" && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Payroll Details</p>
              <div>
                <Label className="text-xs text-gray-500">Driver's License Number</Label>
                <Input value={payroll.drivers_license_number} onChange={e => setP("drivers_license_number", e.target.value)} placeholder="D1234567" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Social Security Number</Label>
                <Input type="password" value={payroll.ssn} onChange={e => setP("ssn", e.target.value)} placeholder="XXX-XX-XXXX" maxLength={11} />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Bank Name</Label>
                <Input value={payroll.bank_name} onChange={e => setP("bank_name", e.target.value)} placeholder="Chase, Wells Fargo..." />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Account Number</Label>
                <Input type="password" value={payroll.account_number} onChange={e => setP("account_number", e.target.value)} placeholder="Account number" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Routing Number</Label>
                <Input value={payroll.routing_number} onChange={e => setP("routing_number", e.target.value)} placeholder="9-digit routing number" maxLength={9} />
              </div>
            </div>
          )}

          {payrollEntry === "send" && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
              An email will be sent to <strong>{form.email || "the barber"}</strong> asking them to log in and complete their payroll information.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                {payrollEntry === "send" ? "Invite & Send Email" : "Add Barber"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}