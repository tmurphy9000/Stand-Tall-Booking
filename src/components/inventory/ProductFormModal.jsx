import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function ProductFormModal({ open, onClose, onSave, product }) {
  const [form, setForm] = useState({
    name: "", sku: "", category: "", cost_per_unit: 0,
    retail_price: 0, stock_quantity: 0, tax_enabled: true,
    tax_rate: 7.5, commission_type: "percentage", commission_value: 10,
  });

  useEffect(() => {
    if (product) {
      setForm(product);
    } else {
      setForm({
        name: "", sku: "", category: "", cost_per_unit: 0,
        retail_price: 0, stock_quantity: 0, tax_enabled: true,
        tax_rate: 7.5, commission_type: "percentage", commission_value: 10,
      });
    }
  }, [product, open]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-gray-500">Product Name *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">SKU</Label>
              <Input value={form.sku} onChange={e => set("sku", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Category</Label>
              <Input value={form.category} onChange={e => set("category", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Cost</Label>
              <Input type="number" value={form.cost_per_unit} onChange={e => set("cost_per_unit", e.target.value === "" ? 0 : parseFloat(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Retail Price *</Label>
              <Input type="number" value={form.retail_price} onChange={e => set("retail_price", e.target.value === "" ? 0 : parseFloat(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Stock</Label>
              <Input type="number" value={form.stock_quantity} onChange={e => set("stock_quantity", e.target.value === "" ? 0 : parseInt(e.target.value))} />
            </div>
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <div>
              <Label className="text-sm">Tax Enabled</Label>
              {form.tax_enabled && (
                <div className="mt-1">
                  <Input
                    type="number"
                    value={form.tax_rate}
                    onChange={e => set("tax_rate", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                    className="w-20 h-7 text-xs"
                    step="0.1"
                  />
                  <span className="text-xs text-gray-400 ml-1">%</span>
                </div>
              )}
            </div>
            <Switch checked={form.tax_enabled} onCheckedChange={v => set("tax_enabled", v)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} className="bg-[#C9A94E] hover:bg-[#A07D2B] text-white">
            {product ? "Update" : "Add Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}