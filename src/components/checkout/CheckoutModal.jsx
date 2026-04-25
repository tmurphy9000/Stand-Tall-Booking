import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, DollarSign, CreditCard } from "lucide-react";
import { entities } from "@/api/entities";
import { functions } from "@/api/functions";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export default function CheckoutModal({ open, onClose, booking, onComplete }) {
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState({ type: "none", value: 0 });
  const [tip, setTip] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [additionalBookings, setAdditionalBookings] = useState([]);

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

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => entities.Booking.list("-date", 100),
    enabled: open,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => entities.Client.list(),
    enabled: open,
  });

  const { data: presetDiscounts = [] } = useQuery({
    queryKey: ["discounts"],
    queryFn: () => entities.Discount.list(),
    enabled: open,
  });

  useEffect(() => {
    if (booking) {
      setItems([{
        id: Date.now(),
        type: "service",
        name: booking.service_name,
        price: booking.price || 0,
        serviceId: booking.service_id,
        barberId: booking.barber_id,
        barberName: booking.barber_name,
        bookingId: booking.id,
      }]);
    }
  }, [booking]);

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
      barberId: booking?.barber_id,
      barberName: booking?.barber_name,
    }]);
  };

  const addBookingToTransaction = (bookingId) => {
    const selectedBooking = bookings.find(b => b.id === bookingId);
    if (!selectedBooking || additionalBookings.includes(bookingId)) return;
    
    setAdditionalBookings([...additionalBookings, bookingId]);
    setItems([...items, {
      id: Date.now(),
      type: "service",
      name: selectedBooking.service_name,
      price: selectedBooking.price || 0,
      serviceId: selectedBooking.service_id,
      barberId: selectedBooking.barber_id,
      barberName: selectedBooking.barber_name,
      bookingId: selectedBooking.id,
    }]);
  };

  const removeItem = (itemId) => {
    const item = items.find(i => i.id === itemId);
    if (item?.bookingId) {
      setAdditionalBookings(additionalBookings.filter(id => id !== item.bookingId));
    }
    setItems(items.filter(i => i.id !== itemId));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price || 0), 0);
  const taxAmount = items.reduce((sum, item) => {
    if (item.type === "product" && item.tax) {
      return sum + (item.price * item.tax / 100);
    }
    return sum;
  }, 0);
  
  const discountAmount = discount.type === "percentage" 
    ? subtotal * (parseFloat(discount.value) / 100)
    : discount.type === "fixed" ? parseFloat(discount.value) || 0 : 0;
  
  const total = subtotal + taxAmount - discountAmount + (tip || 0);

  const handleCheckout = async (paymentIntentId = null) => {
    try {
      // Update primary booking
      await entities.Booking.update(booking.id, {
        status: "completed",
        payment_method: paymentMethod,
        discount_type: discount.type,
        discount_value: discount.value,
        final_price: total,
      });

      // Update additional bookings
      for (const bookingId of additionalBookings) {
        await entities.Booking.update(bookingId, {
          status: "completed",
          payment_method: paymentMethod,
        });
      }

      // Record cash transaction if cash payment
      if (paymentMethod === "cash") {
        await entities.CashTransaction.create({
          type: "inflow",
          amount: total,
          barber_id: booking.barber_id,
          barber_name: booking.barber_name,
          booking_id: booking.id,
          note: `Checkout: ${booking.client_name} - ${items.map(i => i.name).join(", ")}`,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().slice(0, 5),
        });
      }

      // Update product inventory
      for (const item of items.filter(i => i.type === "product")) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          await entities.Product.update(item.productId, {
            stock_quantity: Math.max(0, (product.stock_quantity || 0) - 1),
            total_units_sold: (product.total_units_sold || 0) + 1,
            total_revenue: (product.total_revenue || 0) + item.price,
          });
        }
      }

      toast.success("Checkout completed successfully");
      onComplete();
      onClose();
    } catch (error) {
      toast.error("Checkout failed: " + error.message);
    }
  };

  if (!booking) return null;

  const availableBookings = bookings.filter(b => 
    b.status === "checked_in" && 
    b.id !== booking.id &&
    !additionalBookings.includes(b.id)
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <Elements stripe={stripePromise}>
        <CheckoutContent
          booking={booking}
          onClose={onClose}
          onComplete={onComplete}
          handleCheckout={handleCheckout}
          items={items}
          setItems={setItems}
          discount={discount}
          setDiscount={setDiscount}
          tip={tip}
          setTip={setTip}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          additionalBookings={additionalBookings}
          setAdditionalBookings={setAdditionalBookings}
          addProduct={addProduct}
          addService={addService}
          addBookingToTransaction={addBookingToTransaction}
          removeItem={removeItem}
          subtotal={subtotal}
          taxAmount={taxAmount}
          discountAmount={discountAmount}
          total={total}
          services={services}
          products={products}
          barbers={barbers}
          bookings={bookings}
          presetDiscounts={presetDiscounts}
          clients={clients}
        />
      </Elements>
    </Dialog>
  );
}

function CheckoutContent({
  booking, onClose, onComplete, handleCheckout, items, setItems,
  discount, setDiscount, tip, setTip, paymentMethod, setPaymentMethod,
  additionalBookings, setAdditionalBookings, addProduct, addService,
  addBookingToTransaction, removeItem, subtotal, taxAmount, discountAmount,
  total, services, products, barbers, bookings, presetDiscounts = [], clients = []
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [clientSearch, setClientSearch] = useState(booking?.client_name || "");
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const availableBookings = bookings?.filter(b => 
    b.status === "checked_in" && 
    b.id !== booking?.id &&
    !additionalBookings.includes(b.id)
  ) || [];

  const handleSubmit = async () => {
    if (paymentMethod === "card") {
      if (!stripe || !elements) {
        toast.error("Stripe not loaded");
        return;
      }

      setProcessing(true);
      try {
        const { data: { clientSecret } } = await functions.invoke("createStripePayment", {
          amount: Math.round(total * 100),
          description: `Checkout: ${booking.client_name}`,
          metadata: { booking_id: booking.id }
        });

        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement),
          },
        });

        if (error) {
          toast.error(error.message);
          setProcessing(false);
          return;
        }

        await handleCheckout(paymentIntent.id);
      } catch (error) {
        toast.error("Payment failed: " + error.message);
        setProcessing(false);
      }
    } else {
      await handleCheckout();
    }
  };

  if (!booking) return null;

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Checkout - {booking.client_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client & Barber Info */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <div className="relative">
              <Label className="text-xs text-gray-500">Client</Label>
              <Input
                className="h-8 text-sm"
                value={clientSearch}
                onChange={e => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                onFocus={() => setShowClientDropdown(true)}
                onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
              />
              {showClientDropdown && clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-auto">
                  {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 5).map(c => (
                    <button
                      key={c.id}
                      onMouseDown={() => { setClientSearch(c.name); setShowClientDropdown(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm border-b border-gray-100 last:border-0"
                    >
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-gray-500">{c.phone || c.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-600">Barber: {booking.barber_name}</p>
          </div>

          {/* Items List */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Items</Label>
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-white border border-gray-200 p-2 rounded">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  {item.type === "service" ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-gray-400">By:</span>
                      <Select
                        value={item.barberId || ""}
                        onValueChange={(val) => {
                          const barber = barbers.find(b => b.id === val);
                          setItems(items.map(i => i.id === item.id ? { ...i, barberId: val, barberName: barber?.name || "" } : i));
                        }}
                      >
                        <SelectTrigger className="h-6 text-xs border border-gray-200 rounded px-1.5 py-0 min-w-[90px]">
                          <SelectValue placeholder="Select barber" />
                        </SelectTrigger>
                        <SelectContent>
                          {barbers.map(b => (
                            <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Product{item.tax > 0 ? ` • Tax: ${item.tax}%` : ""}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">${item.price.toFixed(2)}</span>
                  {items.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => removeItem(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Items */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Add Product</Label>
              <Select onValueChange={addProduct}>
                <SelectTrigger className="h-8 text-xs">
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
                <SelectTrigger className="h-8 text-xs">
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

            <div>
              <Label className="text-xs">Add Appointment</Label>
              <Select onValueChange={addBookingToTransaction}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select booking" />
                </SelectTrigger>
                <SelectContent>
                  {availableBookings.map(b => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">
                      {b.client_name} - {b.service_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preset Discounts */}
          {presetDiscounts.filter(d => d.is_active).length > 0 && (
            <div>
              <Label className="text-xs">Quick Discounts</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {presetDiscounts.filter(d => d.is_active).map(d => {
                  const isActive = discount.type === d.type && discount.value === d.value && discount._presetId === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => {
                        if (isActive) {
                          setDiscount({ type: "none", value: 0 });
                        } else {
                          setDiscount({ type: d.type, value: parseFloat(d.value) || 0, _presetId: d.id });
                        }
                      }}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        isActive
                          ? "bg-[#8B9A7E] text-white border-[#8B9A7E]"
                          : "bg-white text-gray-700 border-gray-200 hover:border-[#8B9A7E]"
                      }`}
                    >
                      {d.name} · {d.type === "percentage" ? `${d.value}%` : `$${d.value}`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Discount */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Discount Type</Label>
              <Select value={discount.type} onValueChange={(val) => setDiscount({ ...discount, type: val })}>
                <SelectTrigger className="h-8 text-xs">
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
                  className="h-8 text-xs"
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
              className="h-8 text-xs"
              value={tip}
              onChange={(e) => setTip(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>

          {/* Payment Method */}
          <div>
            <Label className="text-xs">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                {stripePublishableKey && <SelectItem value="card">Card</SelectItem>}
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
          <div className="bg-[#8B9A7E]/10 p-3 rounded-lg space-y-1">
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1 bg-[#8B9A7E] hover:bg-[#6B7A5E]" disabled={processing}>
              {paymentMethod === "card" ? <CreditCard className="w-4 h-4 mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
              {processing ? "Processing..." : "Complete Checkout"}
            </Button>
          </div>
        </div>
    </DialogContent>
  );
}