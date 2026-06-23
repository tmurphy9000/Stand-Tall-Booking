import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { entities } from "@/api/entities";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Mail, Loader2, ClipboardEdit, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  access_level_id: "",
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
  const [payrollEntry, setPayrollEntry] = useState("send");
  const [payroll, setPayroll] = useState(EMPTY_PAYROLL);

  const { data: accessLevels = [] } = useQuery({
    queryKey: ["accessLevels"],
    queryFn: async () => {
      const { data } = await supabase
        .from("access_levels")
        .select("id, name, legacy_permission_level")
        .eq("is_active", true)
        .order("name");
      return data ?? [];
    },
  });

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
      // Resolve access level → legacy permission_level for sync mode
      const selectedLevel = accessLevels.find(l => l.id === form.access_level_id);
      const permissionLevel = selectedLevel?.legacy_permission_level ?? "service_provider";

      // Create barber record + Supabase Auth user via edge function
      const { data, error } = await supabase.functions.invoke("inviteBarber", {
        body: {
          name: fullName,
          email: form.email,
          phone: form.phone,
          permission_level: permissionLevel,
          access_level_id: form.access_level_id || null,
          temp_password: form.temp_password,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (payrollEntry === "manual") {
        await entities.BarberSensitiveInfo.create({
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
        toast.success(`${fullName} added! Share their temporary password: ${form.temp_password}`);
      }

      setForm(EMPTY_FORM);
      setPayroll(EMPTY_PAYROLL);
      setPayrollEntry("send");
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.message || "Failed to add barber");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite New Barber</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Fill in the basic info, then choose how to collect their payroll details.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Basic Info */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Basic Information</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">First Name *</Label>
                <Input value={form.first_name} onChange={e => set("first_name", e.target.value)} placeholder="John" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Last Name *</Label>
                <Input value={form.last_name} onChange={e => set("last_name", e.target.value)} placeholder="Doe" />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Phone Number</Label>
              <Input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="(555) 000-0000" />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Email (Login) *</Label>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="barber@example.com" />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Temporary Password *</Label>
              <Input type="password" value={form.temp_password} onChange={e => set("temp_password", e.target.value)} placeholder="Create a temporary password" />
              <p className="text-xs text-muted-foreground mt-1">They'll be asked to change this on first login</p>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Access Level</Label>
              <Select value={form.access_level_id} onValueChange={v => set("access_level_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select access level" /></SelectTrigger>
                <SelectContent>
                  {accessLevels.map(level => (
                    <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payroll method choice */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payroll & ID Information</p>
            <p className="text-xs text-muted-foreground">How would you like to collect SSN, banking, and license info?</p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPayrollEntry("send")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-sm font-medium transition-all",
                  payrollEntry === "send"
                    ? "border-[#8B9A7E] bg-[#8B9A7E]/10 text-[#6B7A5E]"
                    : "border-border bg-card text-muted-foreground hover:border-gray-300"
                )}
              >
                <Send className="w-5 h-5" />
                <span>Share Manually</span>
                <span className="text-xs font-normal text-center">Share temp password directly</span>
              </button>

              <button
                type="button"
                onClick={() => setPayrollEntry("manual")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-sm font-medium transition-all",
                  payrollEntry === "manual"
                    ? "border-[#8B9A7E] bg-[#8B9A7E]/10 text-[#6B7A5E]"
                    : "border-border bg-card text-muted-foreground hover:border-gray-300"
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
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payroll Details</p>
              <div>
                <Label className="text-xs text-muted-foreground">Driver's License Number</Label>
                <Input value={payroll.drivers_license_number} onChange={e => setP("drivers_license_number", e.target.value)} placeholder="D1234567" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Social Security Number</Label>
                <Input type="password" value={payroll.ssn} onChange={e => setP("ssn", e.target.value)} placeholder="XXX-XX-XXXX" maxLength={11} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Bank Name</Label>
                <Input value={payroll.bank_name} onChange={e => setP("bank_name", e.target.value)} placeholder="Chase, Wells Fargo..." />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Account Number</Label>
                <Input type="password" value={payroll.account_number} onChange={e => setP("account_number", e.target.value)} placeholder="Account number" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Routing Number</Label>
                <Input value={payroll.routing_number} onChange={e => setP("routing_number", e.target.value)} placeholder="9-digit routing number" maxLength={9} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white">
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
            ) : (
              <><Mail className="w-4 h-4 mr-2" />Add Barber</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
