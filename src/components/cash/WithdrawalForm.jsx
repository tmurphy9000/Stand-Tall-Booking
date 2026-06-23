import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

export default function WithdrawalForm({ open, onClose, onSave, barbers, saving }) {
  const [form, setForm] = useState({
    barber_id: "",
    barber_name: "",
    amount: "",
    note: "",
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) setForm({ barber_id: "", barber_name: "", amount: "", note: "" });
  }, [open]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleBarberChange = (id) => {
    const barber = barbers.find(b => b.id === id);
    set("barber_id", id);
    set("barber_name", barber?.name || "");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Log Withdrawal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-muted-foreground">Barber</Label>
            <Select value={form.barber_id} onValueChange={handleBarberChange}>
              <SelectTrigger><SelectValue placeholder="Select barber" /></SelectTrigger>
              <SelectContent>
                {barbers.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Amount ($) *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={e => set("amount", e.target.value)}
              className="text-lg font-semibold"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Note</Label>
            <Textarea value={form.note} onChange={e => set("note", e.target.value)} placeholder="e.g. Dropping in safe" rows={2} />
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p>Date: {format(new Date(), "PPP")}</p>
            <p>Time: {format(new Date(), "h:mm a")}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              const amount = parseFloat(form.amount);
              if (!amount || amount <= 0) return;
              onSave({
                type: "withdrawal",
                amount,
                barber_id: form.barber_id || null,
                barber_name: form.barber_name || null,
                note: form.note || null,
                date: format(new Date(), "yyyy-MM-dd"),
                time: format(new Date(), "HH:mm"),
              });
            }}
            disabled={!form.amount || parseFloat(form.amount) <= 0 || saving}
            className="bg-[#C9A94E] hover:bg-[#A07D2B] text-white gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Record Withdrawal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}