import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addMinutes, parse } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function BookingFormModal({ open, onClose, onSave, barbers, services, prefill }) {
  const [form, setForm] = useState({
    client_name: "",
    client_phone: "",
    client_email: "",
    client_id: "",
    barber_id: "",
    service_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    start_time: "09:00",
    notes: "",
    payment_method: "cash",
    discount_type: "none",
    discount_value: 0,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: timeOffRequests = [] } = useQuery({
    queryKey: ["timeOffRequests"],
    queryFn: () => base44.entities.TimeOffRequest.filter({ status: "approved" }),
  });

  const isBarberAvailable = (barberId, date) => {
    if (!barberId || !date) return true;
    return !timeOffRequests.some(req => 
      req.barber_id === barberId && 
      date >= req.start_date && 
      date <= req.end_date
    );
  };

  useEffect(() => {
    if (prefill) {
      setForm(prev => ({ ...prev, ...prefill }));
    }
  }, [prefill]);

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setForm(prev => ({
        ...prev,
        client_id: clientId,
        client_name: client.name,
        client_email: client.email,
        client_phone: client.phone || "",
      }));
    } else {
      setForm(prev => ({
        ...prev,
        client_id: "",
      }));
    }
  };

  const selectedService = services.find(s => s.id === form.service_id);
  const selectedBarber = barbers.find(b => b.id === form.barber_id);
  const serviceDuration = selectedBarber?.service_durations?.[form.service_id] || selectedService?.duration || 30;

  const endTime = selectedService
    ? format(addMinutes(parse(form.start_time, "HH:mm", new Date()), serviceDuration), "HH:mm")
    : "";

  const finalPrice = selectedService ? (() => {
    let price = selectedService.price;
    if (form.discount_type === "percentage") price -= price * (form.discount_value / 100);
    if (form.discount_type === "fixed") price -= form.discount_value;
    return Math.max(0, price);
  })() : 0;

  const handleSave = () => {
    if (!form.client_name || !form.barber_id || !form.service_id) return;
    onSave({
      ...form,
      barber_name: selectedBarber?.name || "",
      service_name: selectedService?.name || "",
      duration: serviceDuration,
      price: selectedService?.price || 0,
      end_time: endTime,
      final_price: finalPrice,
      status: "scheduled",
    });
  };

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">New Booking</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-gray-500">Select Existing Client (Optional)</Label>
            <Select value={form.client_id} onValueChange={handleClientSelect}>
              <SelectTrigger><SelectValue placeholder="New client or select existing" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>New Client</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} ({client.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-gray-500">Client Name *</Label>
            <Input value={form.client_name} onChange={e => set("client_name", e.target.value)} placeholder="Client name" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Phone</Label>
              <Input value={form.client_phone} onChange={e => set("client_phone", e.target.value)} placeholder="(555) 123-4567" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Email</Label>
              <Input value={form.client_email} onChange={e => set("client_email", e.target.value)} placeholder="email@example.com" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-gray-500">Barber *</Label>
            <Select value={form.barber_id} onValueChange={v => set("barber_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select barber" /></SelectTrigger>
              <SelectContent>
                {barbers.filter(b => b.is_active !== false).map(b => {
                  const available = isBarberAvailable(b.id, form.date);
                  return (
                    <SelectItem key={b.id} value={b.id} disabled={!available}>
                      {b.name} {!available && "(On time off)"}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-gray-500">Service *</Label>
            <Select value={form.service_id} onValueChange={v => set("service_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
              <SelectContent>
                {services.filter(s => s.is_active !== false).map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} — ${s.price} ({s.duration}min)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Date</Label>
              <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Time</Label>
              <Input type="time" value={form.start_time} onChange={e => set("start_time", e.target.value)} step="900" />
            </div>
          </div>

          {selectedService && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Duration</span>
                <span>{serviceDuration} min {selectedBarber?.service_durations?.[form.service_id] && <span className="text-[10px] text-[#8B9A7E]">(custom)</span>}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">End Time</span>
                <span>{endTime}</span>
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs text-gray-500">Discount</Label>
            <div className="flex gap-2">
              <Select value={form.discount_type} onValueChange={v => set("discount_type", v)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="percentage">% Off</SelectItem>
                  <SelectItem value="fixed">$ Off</SelectItem>
                </SelectContent>
              </Select>
              {form.discount_type !== "none" && (
                <Input
                  type="number"
                  value={form.discount_value}
                  onChange={e => set("discount_value", parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
              )}
            </div>
          </div>

          {selectedService && (
            <div className="bg-[#0A0A0A] text-white rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm">Total</span>
              <span className="text-lg font-bold text-[#C9A94E]">${finalPrice.toFixed(2)}</span>
            </div>
          )}

          <div>
            <Label className="text-xs text-gray-500">Payment Method</Label>
            <Select value={form.payment_method} onValueChange={v => set("payment_method", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-gray-500">Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any special instructions..." rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-[#C9A94E] hover:bg-[#A07D2B] text-white">
            Create Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}