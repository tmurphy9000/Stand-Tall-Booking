import React, { useState } from "react";
import { base44 } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Upload, Search, Loader2 } from "lucide-react";
import ProductTable from "../components/inventory/ProductTable";
import ProductFormModal from "../components/inventory/ProductFormModal";
import InventoryAdjustmentDialog from "../components/inventory/InventoryAdjustmentDialog";
import { toast } from "sonner";

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [importing, setImporting] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const createProduct = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); setShowForm(false); },
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); setShowForm(false); setEditProduct(null); },
  });

  const deleteProduct = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  const adjustInventory = useMutation({
    mutationFn: async ({ productId, type, quantity, reason, notes }) => {
      const product = products.find(p => p.id === productId);
      const currentStock = product.stock_quantity || 0;
      const newStock = type === "add" ? currentStock + quantity : currentStock - quantity;
      
      await base44.entities.Product.update(productId, { stock_quantity: Math.max(0, newStock) });
      
      const user = await base44.auth.me();
      await base44.entities.InventoryAdjustment.create({
        product_id: productId,
        product_name: product.name,
        adjustment_type: type,
        quantity,
        reason,
        notes,
        date: new Date().toISOString().split('T')[0],
        adjusted_by: user?.email || "unknown"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setAdjustProduct(null);
      toast.success("Inventory adjusted successfully");
    },
  });

  const handleCSVImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            sku: { type: "string" },
            category: { type: "string" },
            cost_per_unit: { type: "number" },
            retail_price: { type: "number" },
            stock_quantity: { type: "number" },
          },
        },
      },
    });
    if (result.status === "success" && Array.isArray(result.output)) {
      await base44.entities.Product.bulkCreate(result.output);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
    setImporting(false);
  };

  const handleSave = (data) => {
    if (editProduct) {
      updateProduct.mutate({ id: editProduct.id, data });
    } else {
      createProduct.mutate(data);
    }
  };

  const handleAdjustInventory = (product) => {
    setAdjustProduct(product);
  };

  const handleSaveAdjustment = (data) => {
    adjustInventory.mutate({
      productId: adjustProduct.id,
      ...data
    });
  };

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = products.reduce((sum, p) => sum + (p.retail_price || 0) * (p.stock_quantity || 0), 0);
  const lowStockCount = products.filter(p => (p.stock_quantity || 0) <= 5).length;

  return (
    <div className="p-4 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Products</p>
          <p className="text-xl font-bold mt-1">{products.length}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Inventory Value</p>
          <p className="text-xl font-bold mt-1 text-[#C9A94E]">${totalValue.toFixed(0)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Low Stock</p>
          <p className="text-xl font-bold mt-1 text-amber-500">{lowStockCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="pl-9 h-9"
          />
        </div>
        <label>
          <input type="file" accept=".csv,.xlsx" onChange={handleCSVImport} className="hidden" />
          <Button variant="outline" size="sm" className="h-9 gap-1" asChild disabled={importing}>
            <span>
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              CSV
            </span>
          </Button>
        </label>
        <Button size="sm" className="h-9 gap-1 bg-[#C9A94E] hover:bg-[#A07D2B] text-white" onClick={() => { setEditProduct(null); setShowForm(true); }}>
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#C9A94E]" />
        </div>
      ) : (
        <ProductTable
          products={filtered}
          onEdit={(p) => { setEditProduct(p); setShowForm(true); }}
          onDelete={(id) => deleteProduct.mutate(id)}
          onAdjustInventory={handleAdjustInventory}
        />
      )}

      <ProductFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditProduct(null); }}
        onSave={handleSave}
        product={editProduct}
      />

      <InventoryAdjustmentDialog
        open={!!adjustProduct}
        onClose={() => setAdjustProduct(null)}
        product={adjustProduct}
        onSave={handleSaveAdjustment}
      />
    </div>
  );
}