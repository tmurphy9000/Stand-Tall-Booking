import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, DollarSign, CreditCard } from "lucide-react";
import { entities } from "@/api/entities";
import { functions } from "@/api/functions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export default function QuickCheckoutPage() {
  return (
    <Elements stripe={stripePromise}>
      <QuickCheckoutContent />
    </Elements>
  );
}

function QuickCheckoutContent() {
  const [clientName, setClientName] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState({ type: "none", value: 0 });
  const [tip, setTip] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [processing, setProcessing] = useState(false);

  const stripe = useStripe();
  const elements = useElements();
  const queryClient = useQueryClient();

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => entities.Service.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => entities.Product.list(),
  });

  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => entities.Barber.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => entities.Client.list(),
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Product.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  const createCashTransactionMutation = useMutation({
    mutationFn: (data) => entities.CashTransaction.create(data),
  });

  const addService = (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    setItems([...items, {
      id: Date.now(),
      type: "service",
      name: service.name,
      price: service.price,
      serviceId: service.id,
      barberId: "",
      barberName: "",
    }]);
  };

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
      barberId: "",
      barberName: "",
    }]);
  };

  const removeItem = (itemId) => {
    setItems(items.filter(i => i.id !== itemId));
  };

  const updateItemBarber = (itemId, barberId) => {
    const barber = barbers.find(b => b.id === barberId);
    setItems(items.map(item => 
      item.id === itemId 
        ? { ...item, barberId, barberName: barber?.name || "" }
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
    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    const hasUnassignedBarber = items.some(item => !item.barberId);
    if (hasUnassignedBarber) {
      toast.error("Please assign a barber to all items");
      return;
    }

    if (paymentMethod === "card") {
      if (!stripe || !elements) {
        toast.error("Stripe not loaded");
        return;
      }

      setProcessing(true);
      try {
        const { data: { clientSecret } } = await functions.invoke("createStripePayment", {
          amount: Math.round(total * 100),
          description: `Quick Checkout: ${clientName}`,
          metadata: { client_name: clientName }
        });

        const { error } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement),
          },
        });

        if (error) {
          toast.error(error.message);
          setProcessing(false);
          return;
        }

        await completeCheckout();
      } catch (error) {
        toast.error("Payment failed: " + error.message);
        setProcessing(false);
      }
    } else {
      await completeCheckout();
    }
  };

  const completeCheckout = async () => {
    try {
      // Record cash transactions for each barber
      if (paymentMethod === "cash") {
        const barberTotals = items.reduce((acc, item) => {
          if (!acc[item.barberId]) {
            acc[item.barberId] = { name: item.barberName, amount: 0, items: [] };
          }
          acc[item.barberId].amount += item.price;
          acc[item.barberId].items.push(item.name);
          return acc;
        }, {});

        for (const [barberId, data] of Object.entries(barberTotals)) {
          await createCashTransactionMutation.mutateAsync({
            type: "inflow",
            amount: data.amount,
            barber_id: barberId,
            barber_name: data.name,
            note: `Quick Checkout: ${clientName} - ${data.items.join(", ")}`,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().slice(0, 5),
          });
        }
      }

      // Update product inventory
      for (const item of items.filter(i => i.type === "product")) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          await updateProductMutation.mutateAsync({
            id: item.productId,
            data: {
              stock_quantity: Math.max(0, (product.stock_quantity || 0) - 1),
              total_units_sold: (product.total_units_sold || 0) + 1,
              total_revenue: (product.total_revenue || 0) + item.price,
            }
          });
        }
      }

      toast.success("Checkout completed successfully");
      
      // Reset form
      setClientName("");
      setItems([]);
      setDiscount({ type: "none", value: 0 });
      setTip(0);
      setPaymentMethod("cash");
      setProcessing(false);
    } catch (error) {
      toast.error("Checkout failed: " + error.message);
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[#0A0A0A] mb-6">Quick Checkout</h1>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          {/* Client Name with autocomplete */}
          <div className="relative">
            <Label>Client Name (Optional)</Label>
            <Input
              value={clientName}
              onChange={(e) => { setClientName(e.target.value); setShowClientDropdown(true); }}
              onFocus={() => setShowClientDropdown(true)}
              onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
              placeholder="Enter client name (optional)"
            />
            {showClientDropdown && clientName.length > 0 && clients.filter(c => c.name.toLowerCase().includes(clientName.toLowerCase())).length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-auto">
                {clients.filter(c => c.name.toLowerCase().includes(clientName.toLowerCase())).slice(0, 6).map(c => (
                  <button
                    key={c.id}
                    onMouseDown={() => { setClientName(c.name); setShowClientDropdown(false); }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.phone || c.email}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Items</Label>
            {items.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No items added yet</p>
            )}
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-3 rounded">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-gray-500">
                    {item.type === "service" ? "Service" : "Product"}
                    {item.tax > 0 && ` • Tax: ${item.tax}%`}
                  </p>
                </div>
                <div className="w-40">
                  <Select value={item.barberId} onValueChange={(val) => updateItemBarber(item.id, val)}>
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
                <span className="text-sm font-semibold w-16 text-right">${item.price.toFixed(2)}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => removeItem(item.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add Items */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Add Service</Label>
              <Select onValueChange={addService}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-sm">
                      {s.name} - ${s.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Add Product</Label>
              <Select onValueChange={addProduct}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-sm">
                      {p.name} - ${p.retail_price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Discount */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Discount Type</Label>
              <Select value={discount.type} onValueChange={(val) => setDiscount({ ...discount, type: val })}>
                <SelectTrigger className="h-9 text-sm">
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
                 className="h-9 text-sm"
                 value={discount.value === 0 ? "" : discount.value}
                 onChange={(e) => setDiscount({ ...discount, value: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                 placeholder="0"
                />
              </div>
            )}
          </div>

          {/* Tip */}
          <div>
            <Label className="text-xs">Tip</Label>
            <Input
              type="number"
              className="h-9 text-sm"
              value={tip === 0 ? "" : tip}
              onChange={(e) => setTip(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>

          {/* Payment Method */}
          <div>
            <Label className="text-xs">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stripe Card Element */}
          {paymentMethod === "card" && (
            <div className="border border-gray-200 rounded-md p-3">
              <Label className="text-xs mb-2 block">Card Details</Label>
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '14px',
                      color: '#424770',
                      '::placeholder': { color: '#aab7c4' },
                    },
                  },
                }}
              />
            </div>
          )}

          {/* Summary */}
          <div className="bg-[#8B9A7E]/10 p-4 rounded-lg space-y-1">
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
            <div className="flex justify-between text-lg font-bold border-t pt-1">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <Button 
            onClick={handleCheckout} 
            className="w-full bg-[#8B9A7E] hover:bg-[#6B7A5E]"
            disabled={processing}
          >
            {paymentMethod === "card" ? <CreditCard className="w-4 h-4 mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
            {processing ? "Processing..." : "Complete Checkout"}
          </Button>
        </div>
      </div>
    </div>
  );
}