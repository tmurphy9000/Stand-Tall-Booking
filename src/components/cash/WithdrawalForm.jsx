import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

export default function WithdrawalForm({ open, onClose, onSave, barbers }) {
  const [form, setForm] = useState({
    barber_id: "",
    barber_name: "",
    amount: 0,
    note: "",
    location: "",
  });

  useEffect(() => {
    if (open && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm(prev => ({
            ...prev,
            location: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
          }));
        },
        () => {}
      );
    }
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
            <Label className="text-xs text-gray-500">Barber</Label>
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
            <Label className="text-xs text-gray-500">Amount ($)</Label>
            <Input type="number" value={form.amount} onChange={e => set("amount", parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Note</Label>
            <Textarea value={form.note} onChange={e => set("note", e.target.value)} placeholder="e.g. Dropping in safe" rows={2} />
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <p>Date: {format(new Date(), "PPP")}</p>
            <p>Time: {format(new Date(), "h:mm a")}</p>
            {form.location && <p>Location: {form.location}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSave({
              type: "withdrawal",
              amount: form.amount,
              barber_id: form.barber_id,
              barber_name: form.barber_name,
              note: form.note,
              location: form.location,
              date: format(new Date(), "yyyy-MM-dd"),
              time: format(new Date(), "HH:mm"),
            })}
            className="bg-[#C9A94E] hover:bg-[#A07D2B] text-white"
          >
            Record Withdrawal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}