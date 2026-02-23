import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function CheckoutPage() {
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState({ type: "none", value: 0 });
  const [tip, setTip] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [clientName, setClientName] = useState("");
  const queryClient = useQueryClient();

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => base44.entities.Barber.list(),
  });

  const addProduct = (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    setItems([...items, {
      id: Date.now(),
      type: "product",
      name: product.name,
      price: product.retail_price,
      tax: product.tax_enabled ? (product.tax_rate || 7.5) : 0,
      productId: product.id,
      barberId: null,
      barberName: null,
    }]);
  };

  const addService = (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    setItems([...items, {
      id: Date.now(),
      type: "service",
      name: service.name,
      price: service.price,
      serviceId: service.id,
      barberId: null,
      barberName: null,
    }]);
  };

  const removeItem = (itemId) => {
    setItems(items.filter(i => i.id !== itemId));
  };

  const updateItemBarber = (itemId, barberId) => {
    const barber = barbers.find(b => b.id === barberId);
    setItems(items.map(item => 
      item.id === itemId 
        ? { ...item, barberId, barberName: barber?.name || null }
        : item
    ));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price || 0), 0);
  const taxAmount = items.reduce((sum, item) => {
    if (item.type === "product" && item.tax) {
      return sum + (item.price * item.tax / 100);
    }
    return sum;
  }, 0);
  
  const discountAmount = discount.type === "percentage" 
    ? subtotal * (discount.value / 100)
    : discount.type === "fixed" ? discount.value : 0;
  
  const total = subtotal + taxAmount - discountAmount + (tip || 0);

  const handleCheckout = async () => {
    if (!clientName.trim()) {
      toast.error("Please enter client name");
      return;
    }

    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    const missingBarber = items.find(item => !item.barberId);
    if (missingBarber) {
      toast.error("Please assign a service provider to all items");
      return;
    }

    try {
      // Record cash transaction for each barber
      const barberTotals = {};
      items.forEach(item => {
        if (!barberTotals[item.barberId]) {
          barberTotals[item.barberId] = {
            barberId: item.barberId,
            barberName: item.barberName,
            amount: 0,
            items: []
          };
        }
        barberTotals[item.barberId].amount += item.price;
        barberTotals[item.barberId].items.push(item.name);
      });

      if (paymentMethod === "cash") {
        for (const barberData of Object.values(barberTotals)) {
          await base44.entities.CashTransaction.create({
            type: "inflow",
            amount: barberData.amount,
            barber_id: barberData.barberId,
            barber_name: barberData.barberName,
            note: `Checkout: ${clientName} - ${barberData.items.join(", ")}`,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().slice(0, 5),
          });
        }
      }

      // Update product inventory
      for (const item of items.filter(i => i.type === "product")) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          await base44.entities.Product.update(item.productId, {
            stock_quantity: Math.max(0, (product.stock_quantity || 0) - 1),
            total_units_sold: (product.total_units_sold || 0) + 1,
            total_revenue: (product.total_revenue || 0) + item.price,
          });
        }
      }

      toast.success("Checkout completed successfully");
      queryClient.invalidateQueries();
      
      // Reset form
      setItems([]);
      setClientName("");
      setDiscount({ type: "none", value: 0 });
      setTip(0);
      setPaymentMethod("cash");
    } catch (error) {
      toast.error("Checkout failed: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[#0A0A0A] mb-6">Quick Checkout</h1>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          {/* Client Name */}
          <div>
            <Label>Client Name</Label>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Enter client name"
            />
          </div>

          {/* Items List */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Items</Label>
            {items.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No items added yet</p>
            )}
            {items.map((item) => (
              <div key={item.id} className="bg-gray-50 border border-gray-200 p-3 rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.type === "service" ? "Service" : "Product"}
                      {item.tax > 0 && ` • Tax: ${item.tax}%`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">${item.price.toFixed(2)}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => removeItem(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Service Provider</Label>
                  <Select value={item.barberId || ""} onValueChange={(val) => updateItemBarber(item.id, val)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select barber" />
                    </SelectTrigger>
                    <SelectContent>
                      {barbers.filter(b => b.is_active).map(b => (
                        <SelectItem key={b.id} value={b.id} className="text-xs">
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>

          {/* Add Items */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Add Product</Label>
              <Select onValueChange={addProduct}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.filter(p => p.is_active).map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name} - ${p.retail_price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Add Service</Label>
              <Select onValueChange={addService}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services.filter(s => s.is_active).map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name} - ${s.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Discount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Discount Type</Label>
              <Select value={discount.type} onValueChange={(val) => setDiscount({ ...discount, type: val })}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Discount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {discount.type !== "none" && (
              <div>
                <Label className="text-xs">Discount Value</Label>
                <Input
                  type="number"
                  className="h-9 text-xs"
                  value={discount.value}
                  onChange={(e) => setDiscount({ ...discount, value: parseFloat(e.target.value) || 0 })}
                />
              </div>
            )}
          </div>

          {/* Tip */}
          <div>
            <Label className="text-xs">Tip</Label>
            <Input
              type="number"
              className="h-9"
              value={tip}
              onChange={(e) => setTip(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>

          {/* Payment Method */}
          <div>
            <Label className="text-xs">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          <div className="bg-[#8B9A7E]/10 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Discount:</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            {tip > 0 && (
              <div className="flex justify-between text-sm">
                <span>Tip:</span>
                <span>${tip.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <Button 
            onClick={handleCheckout} 
            className="w-full bg-[#8B9A7E] hover:bg-[#6B7A5E] h-12"
            disabled={items.length === 0}
          >
            <DollarSign className="w-5 h-5 mr-2" />
            Complete Checkout
          </Button>
        </div>
      </div>
    </div>
  );
}