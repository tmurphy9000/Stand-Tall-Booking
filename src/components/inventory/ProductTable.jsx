import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, AlertTriangle, Plus, Minus } from "lucide-react";

export default function ProductTable({ products, onEdit, onDelete, onAdjustInventory }) {
  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-gray-100">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50">
            <TableHead className="text-xs">Product</TableHead>
            <TableHead className="text-xs">SKU</TableHead>
            <TableHead className="text-xs text-right">Cost</TableHead>
            <TableHead className="text-xs text-right">Price</TableHead>
            <TableHead className="text-xs text-right">Stock</TableHead>
            <TableHead className="text-xs text-right">Profit/Unit</TableHead>
            <TableHead className="text-xs">Tax</TableHead>
            <TableHead className="text-xs w-32">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => {
            const profit = (p.retail_price || 0) - (p.cost_per_unit || 0);
            const lowStock = (p.stock_quantity || 0) <= 5;
            return (
              <TableRow key={p.id} className="group">
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    {p.category && <p className="text-[10px] text-gray-400">{p.category}</p>}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-gray-500">{p.sku || "—"}</TableCell>
                <TableCell className="text-xs text-right">${(p.cost_per_unit || 0).toFixed(2)}</TableCell>
                <TableCell className="text-xs text-right font-medium">${(p.retail_price || 0).toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {lowStock && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                    <span className={`text-xs font-medium ${lowStock ? "text-amber-600" : "text-gray-700"}`}>
                      {p.stock_quantity || 0}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-right">
                  <span className={profit > 0 ? "text-green-600" : "text-red-500"}>
                    ${profit.toFixed(2)}
                  </span>
                </TableCell>
                <TableCell>
                  {p.tax_enabled ? (
                    <Badge variant="secondary" className="text-[10px]">{p.tax_rate || 7.5}%</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">No Tax</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600" onClick={() => onAdjustInventory(p, 'add')} title="Add Inventory">
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600" onClick={() => onAdjustInventory(p, 'subtract')} title="Subtract Inventory">
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(p)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => onDelete(p.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {products.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12 text-gray-400 text-sm">
                No products yet. Add your first product or import via CSV.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}