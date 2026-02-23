import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AddClientDialog({ open, onClose, onSave }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const handleSubmit = () => {
    if (!form.name || !form.email) return;
    onSave(form);
    setForm({ name: "", email: "", phone: "" });
  };

  const handleClose = () => {
    setForm({ name: "", email: "", phone: "" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm">Name *</Label>
            <Input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Client name"
            />
          </div>

          <div>
            <Label className="text-sm">Email *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="client@example.com"
            />
          </div>

          <div>
            <Label className="text-sm">Phone</Label>
            <Input
              type="tel"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.name || !form.email}
            className="bg-[#8B9A7E] hover:bg-[#6B7A5E]"
          >
            Add Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}