import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function ServiceManager({ services, onCreate, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "", duration: 30, price: 0, category: "",
    commission_type: "percentage", commission_value: 50,
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", duration: 30, price: 0, category: "", commission_type: "percentage", commission_value: 50 });
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm(s);
    setShowForm(true);
  };

  const save = () => {
    const saveData = { ...form, price: form.price === "" ? 0 : form.price };
    if (editing) {
      onUpdate(editing.id, saveData);
    } else {
      onCreate(saveData);
    }
    setShowForm(false);
  };

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const durations = [15, 30, 45, 60, 75, 90, 120];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Services</h3>
        <Button size="sm" className="h-7 text-xs bg-[#C9A94E] hover:bg-[#A07D2B] text-white gap-1" onClick={openNew}>
          <Plus className="w-3 h-3" /> Add
        </Button>
      </div>

      <div className="space-y-2">
        {services.map(s => (
          <div key={s.id} className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-[10px] text-gray-400">{s.duration}min • ${s.price}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(s)}>
                <Pencil className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => onDelete(s.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Service" : "Add Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-gray-500">Name</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500">Duration</Label>
                <Select value={String(form.duration)} onValueChange={v => set("duration", parseInt(v))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {durations.map(d => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Price ($)</Label>
                <Input type="number" value={form.price} onChange={e => set("price", e.target.value === "" ? "" : parseFloat(e.target.value))} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Category</Label>
              <Input value={form.category} onChange={e => set("category", e.target.value)} placeholder="e.g. Haircut, Beard" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={save} className="bg-[#C9A94E] hover:bg-[#A07D2B] text-white">
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}