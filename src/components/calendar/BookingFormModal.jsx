import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addMinutes, parse, addDays, addWeeks, addMonths } from "date-fns";
import { entities } from "@/api/entities";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export default function BookingFormModal({ open, onClose, onSave, barbers, services, prefill, bookings = [] }) {
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
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [duplicateClient, setDuplicateClient] = useState(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState("weekly");
  const [repeatEndDate, setRepeatEndDate] = useState("");
  const [showOutsideHoursWarning, setShowOutsideHoursWarning] = useState(false);
  const [pendingSave, setPendingSave] = useState(null);

  const { data: clients = [], refetch: refetchClients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => entities.Client.list(),
  });

  const { data: timeOffRequests = [] } = useQuery({
    queryKey: ["timeOffRequests"],
    queryFn: () => entities.TimeOffRequest.filter({ status: "approved" }),
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

  const handleClientSelect = (client) => {
    setForm(prev => ({
      ...prev,
      client_id: client.id,
      client_name: client.name,
      client_email: client.email,
      client_phone: client.phone || "",
    }));
    setSearchTerm(client.name);
    setShowDropdown(false);
  };

  const handleNameChange = (value) => {
    setSearchTerm(value);
    set("client_name", value);
    setShowDropdown(value.length > 0);
  };

  const handleContactChange = (field, value) => {
    set(field, value);
  };

  const normalizePhone = (phone) => (phone || "").replace(/\D/g, "");

  const checkForDuplicates = (name, phone, email) => {
    const duplicate = clients.find(c =>
      c.id !== form.client_id &&
      ((phone && normalizePhone(c.phone) === normalizePhone(phone)) ||
       (email && c.email?.toLowerCase() === email?.toLowerCase()))
    );
    if (duplicate) {
      setDuplicateClient(duplicate);
      setShowMergeDialog(true);
    }
  };

  const handleMergeAccounts = async () => {
    if (!duplicateClient) return;
    try {
      // Update the existing client record with any new info — preserves booking history
      await entities.Client.update(duplicateClient.id, {
        name: form.client_name || duplicateClient.name,
        email: form.client_email || duplicateClient.email,
        phone: form.client_phone || duplicateClient.phone,
      });
      setForm(prev => ({ ...prev, client_id: duplicateClient.id }));
      await refetchClients();
      setShowMergeDialog(false);
      setDuplicateClient(null);
      toast.success("Existing client account linked successfully");
    } catch (error) {
      console.error("Error merging accounts:", error);
      toast.error("Failed to link client account");
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  ).slice(0, 5);

  const selectedService = services.find(s => s.id === form.service_id);
  const selectedBarber = barbers.find(b => b.id === form.barber_id);
  const serviceDuration = selectedBarber?.service_durations?.[form.service_id] || selectedService?.duration || 30;
  const servicePrice = selectedBarber?.service_prices?.[form.service_id] ?? selectedService?.price ?? 0;

  const endTime = selectedService
    ? format(addMinutes(parse(form.start_time, "HH:mm", new Date()), serviceDuration), "HH:mm")
    : "";

  const finalPrice = servicePrice;

  const isBlockTime = form.client_name === "BLOCKED TIME";

  const isOutsideBookableHours = () => {
    if (!selectedBarber || !form.start_time || !form.date) return false;
    const dayName = format(new Date(form.date + "T12:00:00"), "EEEE").toLowerCase();
    const dayHours = selectedBarber.hours?.[dayName];
    if (!dayHours || dayHours.off) return false; // Already off that day, don't double-warn
    const { start, end } = dayHours;
    if (!start || !end) return false;
    return form.start_time < start || form.start_time >= end;
  };

  const doSave = async (bookingData) => {
    if (!Array.isArray(bookingData)) {
      // Determine visit type for non-block bookings
      if (!isBlockTime) {
        const clientNameLower = form.client_name?.toLowerCase();
        const isWalkOrCall = clientNameLower === "walk-in" || clientNameLower === "call-in";
        const clientPastBookings = bookings.filter(b =>
          b.status !== "cancelled" && b.barber_id === form.barber_id &&
          (b.client_name?.toLowerCase() === clientNameLower || (form.client_id && b.client_id === form.client_id))
        );
        const isReturn = clientPastBookings.length > 0;
        const isRequest = !isWalkOrCall;
        let visit_type = "NR";
        if (isReturn && isRequest) visit_type = "RR";
        else if (isReturn && !isRequest) visit_type = "RNR";
        else if (!isReturn && isRequest) visit_type = "NR";
        else visit_type = "NNR";
        bookingData.visit_type = visit_type;
      }
    }
    await onSave(bookingData);
  };

  const handleSave = async () => {
    if (!form.client_name || !form.barber_id || (!isBlockTime && !form.service_id)) return;

    // Auto-create client if doesn't exist and not a blocked time
    let finalClientId = form.client_id;
    if (!isBlockTime && !form.client_id && form.client_name) {
      try {
        // Reuse existing client if email or phone matches (normalized)
        const existing = clients.find(c =>
          (form.client_email && c.email?.toLowerCase() === form.client_email.toLowerCase()) ||
          (form.client_phone && normalizePhone(c.phone) === normalizePhone(form.client_phone))
        );
        if (existing) {
          finalClientId = existing.id;
        } else if (form.client_email || form.client_phone) {
          const newClient = await entities.Client.create({
            name: form.client_name,
            email: form.client_email || "",
            phone: form.client_phone || "",
          });
          finalClientId = newClient.id;
        }
      } catch (error) {
        console.error("Error creating client:", error);
      }
    }

    const baseBooking = {
      ...form,
      client_id: finalClientId,
      barber_name: selectedBarber?.name || "",
      service_name: selectedService?.name || form.service_name || "Blocked",
      duration: serviceDuration,
      price: servicePrice,
      end_time: endTime,
      final_price: finalPrice,
      status: "scheduled",
    };

    let bookingData;
    if (!isBlockTime || !repeatEnabled || !repeatEndDate) {
      bookingData = baseBooking;
    } else {
      // Generate repeated block bookings
      const dates = [];
      let current = new Date(form.date + "T12:00:00");
      const end = new Date(repeatEndDate + "T12:00:00");
      while (current <= end) {
        dates.push(format(current, "yyyy-MM-dd"));
        if (repeatFrequency === "daily") current = addDays(current, 1);
        else if (repeatFrequency === "weekly") current = addWeeks(current, 1);
        else if (repeatFrequency === "biweekly") current = addWeeks(current, 2);
        else if (repeatFrequency === "monthly") current = addMonths(current, 1);
      }
      const repeat_group_id = crypto.randomUUID();
      bookingData = dates.map(date => ({ ...baseBooking, date, repeat_group_id }));
    }

    if (isOutsideBookableHours()) {
      setPendingSave(bookingData);
      setShowOutsideHoursWarning(true);
      return;
    }

    try {
      await doSave(bookingData);
    } catch (err) {
      console.error("Failed to save booking:", err);
      toast.error("Failed to save booking: " + (err.message || "Unknown error"));
    }
  };

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">New Booking</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="relative">
            <Label className="text-xs text-gray-500">Client Name *</Label>
            <Input 
              value={searchTerm} 
              onChange={e => handleNameChange(e.target.value)} 
              onFocus={() => setShowDropdown(searchTerm.length > 0)}
              placeholder="Start typing client name..." 
            />
            {showDropdown && filteredClients.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredClients.map(client => (
                  <button
                    key={client.id}
                    onClick={() => handleClientSelect(client)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    <div className="font-medium text-sm">{client.name}</div>
                    <div className="text-xs text-gray-500">{client.phone} • {client.email}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Phone</Label>
              <Input value={form.client_phone} onChange={e => handleContactChange("client_phone", e.target.value)} onBlur={() => checkForDuplicates(form.client_name, form.client_phone, form.client_email)} placeholder="(555) 123-4567" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Email</Label>
              <Input value={form.client_email} onChange={e => handleContactChange("client_email", e.target.value)} onBlur={() => checkForDuplicates(form.client_name, form.client_phone, form.client_email)} placeholder="email@example.com" />
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
                {services.filter(s => {
                  if (s.is_active === false) return false;
                  if (!selectedBarber) return true;
                  const availableServices = selectedBarber.available_services;
                  if (!availableServices || availableServices.length === 0) return true;
                  return availableServices.includes(s.id);
                }).map(s => {
                  const customDuration = selectedBarber?.service_durations?.[s.id];
                  const customPrice = selectedBarber?.service_prices?.[s.id];
                  const displayDuration = customDuration || s.duration;
                  const displayPrice = customPrice ?? s.price;
                  return (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — ${displayPrice} ({displayDuration}min)
                    </SelectItem>
                  );
                })}
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
              <Input type="time" value={form.start_time} onChange={e => set("start_time", e.target.value)} step="300" />
            </div>
          </div>

          {selectedService && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Duration</span>
                <span>{serviceDuration} min {selectedBarber?.service_durations?.[form.service_id] && <span className="text-[10px] text-[#8B9A7E]">(custom)</span>}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Price</span>
                <span>${servicePrice.toFixed(2)} {selectedBarber?.service_prices?.[form.service_id] !== undefined && <span className="text-[10px] text-[#8B9A7E]">(custom)</span>}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">End Time</span>
                <span>{endTime}</span>
              </div>
            </div>
          )}

          {selectedService && (
            <div className="bg-[#0A0A0A] text-white rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm">Total</span>
              <span className="text-lg font-bold text-[#B0BFA4]">${finalPrice.toFixed(2)}</span>
            </div>
          )}

          {isBlockTime && (
            <div className="space-y-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-orange-800">Repeat this block?</Label>
                <button
                  type="button"
                  onClick={() => setRepeatEnabled(p => !p)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${repeatEnabled ? "bg-orange-500" : "bg-gray-300"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${repeatEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
              {repeatEnabled && (
                <>
                  <div>
                    <Label className="text-xs text-gray-500">Repeat Frequency</Label>
                    <Select value={repeatFrequency} onValueChange={setRepeatFrequency}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Repeat Until</Label>
                    <Input type="date" value={repeatEndDate} onChange={e => setRepeatEndDate(e.target.value)} min={form.date} />
                  </div>
                </>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs text-gray-500">Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any special instructions..." rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-[#B0BFA4] hover:bg-[#8B9A7E] text-white">
            Create Booking
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Outside Bookable Hours Warning */}
      <Dialog open={showOutsideHoursWarning} onOpenChange={setShowOutsideHoursWarning}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Outside Bookable Hours</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            This appointment is outside of bookable hours. Do you want to continue?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowOutsideHoursWarning(false); setPendingSave(null); }}>
              No, Cancel
            </Button>
            <Button className="bg-[#B0BFA4] hover:bg-[#8B9A7E] text-white" onClick={async () => { setShowOutsideHoursWarning(false); try { await doSave(pendingSave); } catch (err) { toast.error("Failed to save booking: " + (err.message || "Unknown error")); } setPendingSave(null); }}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Accounts Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-red-600">Duplicate Account Detected</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              A client with the same phone or email already exists:
            </p>
            {duplicateClient && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div><strong>Name:</strong> {duplicateClient.name}</div>
                <div><strong>Phone:</strong> {duplicateClient.phone}</div>
                <div><strong>Email:</strong> {duplicateClient.email}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)}>Cancel</Button>
            <Button onClick={handleMergeAccounts} className="bg-[#B0BFA4] hover:bg-[#8B9A7E] text-white">
              Merge Accounts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}