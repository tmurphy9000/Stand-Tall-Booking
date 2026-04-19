import React, { useState } from "react";
import { entities } from "@/api/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";

const emptyForm = { name: "", type: "percentage", value: "", is_active: true };

export default function DiscountManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: discounts = [] } = useQuery({
    queryKey: ["discounts"],
    queryFn: () => entities.Discount.list(),
  });

  const createDiscount = useMutation({
    mutationFn: (data) => entities.Discount.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discounts"] }),
  });

  const updateDiscount = useMutation({
    mutationFn: ({ id, data }) => entities.Discount.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discounts"] }),
  });

  const deleteDiscount = useMutation({
    mutationFn: (id) => entities.Discount.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discounts"] }),
  });

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    setForm({ name: d.name, type: d.type, value: d.value, is_active: d.is_active });
    setShowForm(true);
  };

  const handleSave = () => {
    const payload = { ...form, value: parseFloat(form.value) || 0 };
    if (editing) {
      updateDiscount.mutate({ id: editing.id, data: payload });
    } else {
      createDiscount.mutate(payload);
    }
    setShowForm(false);
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Discounts</h2>
        <Button size="sm" onClick={openNew} className="bg-[#8B9A7E] hover:bg-[#6B7A5E] h-8 text-xs gap-1">
          <Plus className="w-3 h-3" /> Add Discount
        </Button>
      </div>

      {discounts.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm border border-dashed rounded-lg">
          <Tag className="w-6 h-6 mx-auto mb-2 opacity-40" />
          No discounts yet. Add one to use at checkout.
        </div>
      )}

      <div className="space-y-2">
        {discounts.map((d) => (
          <div key={d.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <Tag className="w-4 h-4 text-[#8B9A7E]" />
              <div>
                <p className="text-sm font-medium">{d.name}</p>
                <p className="text-xs text-gray-500">
                  {d.type === "percentage" ? `${d.value}% off` : `$${d.value} off`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={d.is_active}
                onCheckedChange={(val) => updateDiscount.mutate({ id: d.id, data: { is_active: val } })}
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(d)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => deleteDiscount.mutate(d.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">{editing ? "Edit Discount" : "New Discount"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="text-xs text-gray-500">Label</Label>
              <Input
                placeholder="e.g. Senior, Military, Employee"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Type</Label>
              <Select value={form.type} onValueChange={(val) => setForm({ ...form, type: val })}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">{form.type === "percentage" ? "Percentage" : "Dollar Amount"}</Label>
              <Input
                type="number"
                placeholder={form.type === "percentage" ? "e.g. 10" : "e.g. 5.00"}
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} className="bg-[#8B9A7E] hover:bg-[#6B7A5E]">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}