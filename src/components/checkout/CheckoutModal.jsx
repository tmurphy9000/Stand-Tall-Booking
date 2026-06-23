import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, DollarSign, CreditCard, Tablet, ChevronsUpDown, TicketPercent, Check } from "lucide-react";
import { entities } from "@/api/entities";
import { functions } from "@/api/functions";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useShop } from "@/lib/shopContext";
import TerminalPayment from "@/components/checkout/TerminalPayment";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export default function CheckoutModal({ open, onClose, booking, onComplete }) {
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState({ type: "none", value: 0 });
  const [tip, setTip] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [additionalBookings, setAdditionalBookings] = useState([]);
  const [appliedPromo, setAppliedPromo] = useState(null);

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
    queryFn: () => entities.Booking.list("-date", 500),
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

  // Reset ALL checkout state when a new booking is opened.
  // Without this, discount, tip, paymentMethod, and additionalBookings bleed
  // from one checkout session into the next because the component stays mounted.
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
      setAdditionalBookings([]);
      setDiscount({ type: "none", value: 0 });
      setTip("");
      setPaymentMethod("cash");
      setAppliedPromo(null);
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

  const promoDiscountAmount = appliedPromo
    ? appliedPromo.type === "percent"
      ? subtotal * (appliedPromo.value / 100)
      : Math.min(appliedPromo.value, subtotal)
    : 0;

  const depositPaid = (booking?.deposit_amount_paid || 0) / 100;
  const total = subtotal + taxAmount - discountAmount - promoDiscountAmount + (parseFloat(tip) || 0) - depositPaid;

  const handleCheckout = async (paymentIntentId = null) => {
    try {
      // Update primary booking
      const productItems = items.filter(i => i.type === "product");
      const productRevenue = productItems.reduce((sum, i) => sum + (i.price || 0), 0);
      const productNames = productItems.map(i => i.name).join(", ") || null;

      await entities.Booking.update(booking.id, {
        status: "completed",
        completed_at: new Date().toISOString(),
        final_price: total,
        tip: parseFloat(tip) || 0,
        product_revenue: productRevenue,
        product_names: productNames,
        tax_amount: taxAmount,
        discount_amount: discountAmount + promoDiscountAmount,
        payment_method: paymentMethod,
        ...(appliedPromo ? { promo_code_id: appliedPromo.id } : {}),
        ...(paymentIntentId ? { stripe_payment_intent_id: paymentIntentId } : {}),
      });

      // Update additional bookings
      for (const bookingId of additionalBookings) {
        await entities.Booking.update(bookingId, {
          status: "completed",
        });
      }

      // Record cash transaction
      if (paymentMethod === "cash" || paymentMethod === "other") {
        await entities.CashTransaction.create({
          type: "inflow",
          amount: total,
          barber_id: booking.barber_id,
          barber_name: booking.barber_name,
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
      <Elements
        stripe={stripePromise}
        options={{
          mode: 'payment',
          amount: Math.max(50, Math.round(Math.max(0, total) * 100)),
          currency: 'usd',
          paymentMethodCreation: 'manual',
          appearance: { theme: 'night' },
          loader: 'never',
          paymentMethodTypes: ['card'],
        }}
      >
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
          promoDiscountAmount={promoDiscountAmount}
          appliedPromo={appliedPromo}
          setAppliedPromo={setAppliedPromo}
          depositPaid={depositPaid}
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
  promoDiscountAmount, appliedPromo, setAppliedPromo,
  depositPaid, total, services, products, barbers, bookings, presetDiscounts = [], clients = []
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [cardError, setCardError] = useState(null);
  const [tipMode, setTipMode] = useState("preset"); // "preset" | "custom"
  const [tipPct, setTipPct] = useState(null); // null = nothing selected
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const { shopId } = useShop();

  const applyPromoCode = useCallback(async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoError("");
    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", code)
        .eq("shop_id", shopId)
        .eq("active", true)
        .single();
      if (error || !data) { setPromoError("Invalid or inactive code."); return; }
      if (data.expires_at && new Date(data.expires_at) < new Date()) { setPromoError("This code has expired."); return; }
      if (data.max_uses != null && data.use_count >= data.max_uses) { setPromoError("This code has reached its maximum uses."); return; }
      setAppliedPromo(data);
      setPromoError("");
    } catch {
      setPromoError("Could not validate code. Please try again.");
    } finally {
      setPromoLoading(false);
    }
  }, [promoInput, shopId, setAppliedPromo]);

  // Keep Elements amount in sync with the checkout total (Stripe ignores options prop after mount)
  useEffect(() => {
    if (!elements) return;
    try { elements.update({ amount: Math.max(50, Math.round(Math.max(0, total) * 100)) }); } catch (_) {}
  }, [total, elements]);
  const { shopId, stripeAccountId, stripeTerminalLocationId } = useShop();
  const [clientSearch, setClientSearch] = useState(booking?.client_name || "");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [bookingPopoverOpen, setBookingPopoverOpen] = useState(false);

  const bookingDate = booking?.date?.slice(0, 10);
  console.log("[CheckoutModal] booking.date raw:", booking?.date, "→ normalized:", bookingDate, "| sample b.date raw:", bookings?.[0]?.date, "→ normalized:", bookings?.[0]?.date?.slice(0, 10));

  const EXCLUDED_STATUSES = ["completed", "cancelled", "no_show", "checked_out"];
  // Walk-ins and call-ins are always individual transactions for anonymous clients.
  // Exclude them from the "Add Appointment" picker so they can't be accidentally bundled.
  const WALKIN_NAMES = ["Walk-in", "Call-in"];
  const availableBookings = (bookings?.filter(b =>
    !EXCLUDED_STATUSES.includes(b.status) &&
    b.date?.slice(0, 10) === bookingDate &&
    b.id !== booking?.id &&
    !additionalBookings.includes(b.id) &&
    !WALKIN_NAMES.includes(b.client_name)
  ) || []).sort((a, b) => a.client_name.localeCompare(b.client_name));
  console.log("[CheckoutModal] availableBookings:", availableBookings.map(b => ({ client: b.client_name, date: b.date, status: b.status })));

  const friendlyCardError = (err) => {
    if (!err) return "Payment failed. Please try again.";
    const code = err.code || "";
    if (code === "card_declined") return "The card was declined. Please try a different card.";
    if (code === "insufficient_funds") return "This card has insufficient funds.";
    if (code === "incorrect_cvc") return "The security code (CVC) is incorrect.";
    if (code === "expired_card") return "This card has expired.";
    if (code === "incorrect_number" || code === "invalid_number") return "The card number is incorrect.";
    if (err.type === "card_error") return err.message || "The card was declined.";
    return "Payment failed. Please try again or use a different payment method.";
  };

  const handleSubmit = async () => {
    if (paymentMethod === "reader") return; // Terminal handles its own flow

    if (paymentMethod === "card") {
      if (!stripe || !elements) {
        setCardError("Payment system not ready. Please refresh and try again.");
        return;
      }
      if (!stripeAccountId) {
        setCardError("Card payments require a connected Stripe account. Go to Settings → Payments.");
        return;
      }

      setCardError(null);
      setProcessing(true);
      try {
        // Step 1: validate the PaymentElement form
        const { error: submitError } = await elements.submit();
        if (submitError) {
          setCardError(friendlyCardError(submitError));
          setProcessing(false);
          return;
        }

        // Step 2: tokenise the card (manual creation — no PI needed yet)
        const { paymentMethod: pm, error: pmError } = await stripe.createPaymentMethod({ elements });
        if (pmError) {
          setCardError(friendlyCardError(pmError));
          setProcessing(false);
          return;
        }

        // Step 3: create the PaymentIntent on the server
        const chargeAmount = Math.max(50, Math.round(Math.max(0, total) * 100));
        console.log("[Checkout] Step 3 — invoking createStripePayment, amount (cents):", chargeAmount, "shopId:", shopId);
        const { data, error: fnError } = await functions.invoke("createStripePayment", {
          amount: chargeAmount,
          description: `Checkout: ${booking.client_name}`,
          metadata: { booking_id: booking.id },
          shopId,
        });
        console.log("[Checkout] Step 3 response — full data:", JSON.stringify(data), "fnError:", fnError);

        if (fnError || !data?.clientSecret) {
          console.error("[Checkout] Step 3 failed — no clientSecret. data:", data, "fnError:", fnError);
          setCardError(data?.error || "Could not create payment. Please try again.");
          setProcessing(false);
          return;
        }

        // Step 4: confirm the payment
        console.log("[Checkout] Step 4 — calling stripe.confirmPayment, clientSecret prefix:", data.clientSecret?.slice(0, 30), "pm.id:", pm.id);
        const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
          clientSecret: data.clientSecret,
          confirmParams: { payment_method: pm.id },
          redirect: 'if_required',
        });
        console.log("[Checkout] Step 4 response — full paymentIntent:", JSON.stringify(paymentIntent), "confirmError:", confirmError);

        if (confirmError) {
          setCardError(friendlyCardError(confirmError));
          setProcessing(false);
          return;
        }

        if (paymentIntent?.status !== "succeeded") {
          console.error("[Checkout] Step 4 status not succeeded — status:", paymentIntent?.status, "id:", paymentIntent?.id);
          setCardError("Payment was not completed. Please try again.");
          setProcessing(false);
          return;
        }

        console.log("[Checkout] Payment succeeded — paymentIntent.id:", paymentIntent.id, "saving to booking:", booking.id);
        await handleCheckout(paymentIntent.id);
      } catch (err) {
        setCardError("Payment failed. Please try again or use a different method.");
        setProcessing(false);
      }
    } else {
      await handleCheckout();
    }
  };

  if (!booking) return null;

  return (
    <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Add Product</Label>
              <Select onValueChange={addProduct}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
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
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name} - ${s.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Add Appointment</Label>
              <Popover open={bookingPopoverOpen} onOpenChange={setBookingPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="h-8 w-full text-xs justify-between font-normal px-2"
                  >
                    <span className="text-muted-foreground">Select booking</span>
                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search client..." className="h-8 text-xs" />
                    <CommandList>
                      <CommandEmpty className="py-3 text-xs text-center text-gray-500">No bookings found.</CommandEmpty>
                      <CommandGroup>
                        {availableBookings.map(b => (
                          <CommandItem
                            key={b.id}
                            value={b.client_name + " " + b.service_name}
                            onSelect={() => {
                              addBookingToTransaction(b.id);
                              setBookingPopoverOpen(false);
                            }}
                            className="text-xs"
                          >
                            <span className="font-medium">{b.client_name}</span>
                            <span className="text-gray-400 ml-1">– {b.service_name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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

          {/* Promo Code */}
          <div>
            <Label className="text-xs">Promo Code</Label>
            {appliedPromo ? (
              <div className="flex items-center gap-2 mt-1 p-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <Check className="w-4 h-4 text-green-600 shrink-0" />
                <span className="text-sm font-mono font-semibold text-green-700 dark:text-green-400">{appliedPromo.code}</span>
                <span className="text-sm text-green-600 dark:text-green-500">
                  — {appliedPromo.type === "percent" ? `${appliedPromo.value}%` : `$${Number(appliedPromo.value).toFixed(2)}`} off
                </span>
                <button className="ml-auto text-green-500 hover:text-green-700" onClick={() => { setAppliedPromo(null); setPromoInput(""); }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2 mt-1">
                <Input
                  value={promoInput}
                  onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                  onKeyDown={e => e.key === "Enter" && applyPromoCode()}
                  placeholder="Enter code"
                  className="h-8 text-xs font-mono uppercase"
                />
                <button
                  onClick={applyPromoCode}
                  disabled={promoLoading || !promoInput.trim()}
                  className="h-8 px-3 rounded-md border border-input bg-background hover:bg-accent text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <TicketPercent className="w-3 h-3" />
                  {promoLoading ? "..." : "Apply"}
                </button>
              </div>
            )}
            {promoError && <p className="text-xs text-red-500 mt-1">{promoError}</p>}
          </div>

          {/* Discount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
            <div className="grid grid-cols-4 gap-1.5 mt-1.5">
              {/* No Tip */}
              <button
                type="button"
                onClick={() => { setTipPct(0); setTipMode("preset"); setTip("0"); }}
                className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                  tipMode === "preset" && tipPct === 0
                    ? "bg-[#8B9A7E] border-[#8B9A7E] text-white"
                    : "bg-white border-gray-200 text-gray-600 hover:border-[#8B9A7E]/50"
                }`}
              >
                No Tip
              </button>

              {/* Percentage presets */}
              {[10, 15, 20, 25, 30].map(pct => {
                const dollars = Math.max(0, subtotal - discountAmount) * pct / 100;
                const active = tipMode === "preset" && tipPct === pct;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => { setTipPct(pct); setTipMode("preset"); setTip(dollars.toFixed(2)); }}
                    className={`py-2 rounded-lg border text-xs transition-all ${
                      active
                        ? "bg-[#8B9A7E] border-[#8B9A7E] text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:border-[#8B9A7E]/50"
                    }`}
                  >
                    <div className="font-semibold">{pct}%</div>
                    <div className={`text-[10px] mt-0.5 ${active ? "text-white/80" : "text-gray-400"}`}>
                      ${dollars.toFixed(2)}
                    </div>
                  </button>
                );
              })}

              {/* Custom $ */}
              <button
                type="button"
                onClick={() => { setTipMode("custom"); setTipPct(null); }}
                className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                  tipMode === "custom"
                    ? "bg-[#8B9A7E]/10 border-[#8B9A7E] text-[#8B9A7E]"
                    : "bg-white border-gray-200 text-gray-600 hover:border-[#8B9A7E]/50"
                }`}
              >
                Custom $
              </button>
            </div>

            {tipMode === "custom" && (
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-8 text-xs pl-6"
                  value={tip}
                  onChange={(e) => setTip(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            )}
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
                {stripePublishableKey && stripeAccountId && <SelectItem value="card">Manual Card Entry</SelectItem>}
                {stripeAccountId && <SelectItem value="reader">Card Reader (Terminal)</SelectItem>}
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Card payment */}
          {paymentMethod === "card" && (
            <div className="space-y-2">
              <div className="rounded-lg border border-gray-700 bg-[#0f0f0f] p-4">
                <Label className="text-xs text-gray-400 mb-3 block">Card Details</Label>
                <PaymentElement
                  onChange={() => setCardError(null)}
                  options={{
                    layout: 'tabs',
                    wallets: { applePay: 'never', googlePay: 'never' },
                  }}
                />
              </div>
              {cardError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  <CreditCard className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{cardError}</span>
                </div>
              )}
              {depositPaid > 0 && (
                <p className="text-xs text-gray-500">
                  Deposit of ${depositPaid.toFixed(2)} already collected — only the remaining balance will be charged.
                </p>
              )}
            </div>
          )}

          {/* Terminal payment */}
          {paymentMethod === "reader" && (
            <TerminalPayment
              shopId={shopId}
              locationId={stripeTerminalLocationId}
              amountCents={Math.round(total * 100)}
              description={`Checkout: ${booking.client_name}`}
              metadata={{ booking_id: booking.id }}
              onSuccess={(paymentIntentId) => handleCheckout(paymentIntentId)}
              onCancel={() => setPaymentMethod("cash")}
            />
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
            {promoDiscountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Promo ({appliedPromo.code}):</span>
                <span>-${promoDiscountAmount.toFixed(2)}</span>
              </div>
            )}
            {parseFloat(tip) > 0 && (
              <div className="flex justify-between text-sm">
                <span>Tip:</span>
                <span>${(parseFloat(tip)).toFixed(2)}</span>
              </div>
            )}
            {depositPaid > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Deposit collected:</span>
                <span>-${depositPaid.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-1">
              <span>Total:</span>
              <span>${Math.max(0, total).toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          {paymentMethod !== "reader" && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1" disabled={processing}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="flex-1 bg-[#8B9A7E] hover:bg-[#6B7A5E]" disabled={processing}>
                {paymentMethod === "card" ? <CreditCard className="w-4 h-4 mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
                {processing
                  ? "Processing..."
                  : paymentMethod === "card"
                  ? `Charge $${Math.max(0, total).toFixed(2)}`
                  : "Complete Checkout"}
              </Button>
            </div>
          )}
        </div>
    </DialogContent>
  );
}