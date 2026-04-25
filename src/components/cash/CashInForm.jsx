import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

export default function CashInForm({ open, onClose, onSave, barbers, saving }) {
  const [form, setForm] = useState({ barber_id: "", barber_name: "", amount: "", note: "" });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleBarberChange = (id) => {
    const barber = barbers.find(b => b.id === id);
    setForm(prev => ({ ...prev, barber_id: id, barber_name: barber?.name || "" }));
  };

  const handleSave = () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return;
    onSave({
      type: "inflow",
      amount,
      barber_id: form.barber_id || null,
      barber_name: form.barber_name || null,
      note: form.note || null,
      date: format(new Date(), "yyyy-MM-dd"),
      time: format(new Date(), "HH:mm"),
    });
    setForm({ barber_id: "", barber_name: "", amount: "", note: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Cash In</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-gray-500">Amount ($) *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={e => set("amount", e.target.value)}
              className="text-lg font-semibold"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Barber</Label>
            <Select value={form.barber_id} onValueChange={handleBarberChange}>
              <SelectTrigger><SelectValue placeholder="Select barber (optional)" /></SelectTrigger>
              <SelectContent>
                {barbers.filter(b => b.is_active !== false).map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Note / Reason</Label>
            <Textarea
              value={form.note}
              onChange={e => set("note", e.target.value)}
              placeholder="e.g. Manual cash entry"
              rows={2}
            />
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <p>Date: {format(new Date(), "PPP")}</p>
            <p>Time: {format(new Date(), "h:mm a")}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={!form.amount || parseFloat(form.amount) <= 0 || saving}
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Record Cash In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
