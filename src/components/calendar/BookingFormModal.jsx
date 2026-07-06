import React, { useState, useEffect, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addMinutes, parse, addDays, addWeeks, addMonths } from "date-fns";
import { entities } from "@/api/entities";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

function generateSlots(start, end, intervalMins) {
  const slots = [];
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let cur = sh * 60 + sm;
  const endMins = eh * 60 + em;
  while (cur < endMins) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    slots.push({ time, label: format(parse(time, "HH:mm", new Date()), "h:mm a") });
    cur += intervalMins;
  }
  return slots;
}

function isSlotTaken(slotTime, duration, bookings) {
  const [sh, sm] = slotTime.split(":").map(Number);
  const slotStart = sh * 60 + sm;
  const slotEnd = slotStart + duration;
  return bookings.some((b) => {
    if (b.status === "cancelled") return false;
    const [bh, bm] = b.start_time.split(":").map(Number);
    const bStart = bh * 60 + bm;
    const bEnd = bStart + (b.duration || 30);
    return slotStart < bEnd && slotEnd > bStart;
  });
}

export default function BookingFormModal({ open, onClose, onSave, barbers, services, prefill, bookings = [], minBookingNotice = 0 }) {
  const [form, setForm] = useState({
    client_name: "",
    client_phone: "",
    client_email: "",
    client_id: null,
    barber_id: "",
    service_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    start_time: "",
    notes: "",
  });
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [duplicateClient, setDuplicateClient] = useState(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState("weekly");
  const [repeatEndDate, setRepeatEndDate] = useState("");
  const [showOutsideHoursWarning, setShowOutsideHoursWarning] = useState(false);
  const [pendingSave, setPendingSave] = useState(null);
  const [pendingSlotTime, setPendingSlotTime] = useState(null);

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

  // Fetch booked slots for the selected barber + date via the same RPC the public booking page uses.
  // Filter to the selected barber client-side (RPC returns all barbers for the date).
  useEffect(() => {
    if (!form.barber_id || !form.date) {
      setBookedSlots([]);
      return;
    }
    const shopId = barbers[0]?.shop_id;
    if (!shopId) return;

    let cancelled = false;
    setLoadingSlots(true);
    supabase
      .rpc("get_booked_slots", { p_shop_id: shopId, p_date: form.date })
      .then(({ data }) => {
        if (!cancelled) setBookedSlots((data ?? []).filter(s => s.barber_id === form.barber_id));
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoadingSlots(false); });

    return () => { cancelled = true; };
  }, [form.barber_id, form.date, barbers]);

  const selectedService = services.find(s => s.id === form.service_id);
  const selectedBarber = barbers.find(b => b.id === form.barber_id);
  const serviceDuration = selectedBarber?.service_durations?.[form.service_id] || selectedService?.duration || 30;
  const servicePrice = selectedBarber?.service_prices?.[form.service_id] ?? selectedService?.price ?? 0;
  const endTime = (selectedService && form.start_time)
    ? format(addMinutes(parse(form.start_time, "HH:mm", new Date()), serviceDuration), "HH:mm")
    : "";
  const finalPrice = servicePrice;
  const isBlockTime = form.client_name === "BLOCKED TIME";

  // Build the slot grid: all slots 06:00–22:00, marked taken/outsideHours/free.
  // outsideHours slots are greyed but clickable — admin gets a confirmation dialog.
  // null = barber or date not yet selected (show placeholder).
  const slots = useMemo(() => {
    if (!selectedBarber || !form.date) return null;
    const dayName = format(new Date(form.date + "T12:00:00"), "EEEE").toLowerCase();
    const dayHours = selectedBarber.hours?.[dayName];

    const todayStr = format(new Date(), "yyyy-MM-dd");
    const cutoffHHMM = form.date === todayStr
      ? format(addMinutes(new Date(), minBookingNotice), "HH:mm")
      : null;

    const barberOff = !dayHours || dayHours.off || dayHours.closed || !dayHours.start || !dayHours.end;

    return generateSlots("06:00", "22:00", 15).map(slot => {
      const withinHours = !barberOff &&
        slot.time >= dayHours.start && slot.time < dayHours.end;
      const taken = isSlotTaken(slot.time, serviceDuration, bookedSlots) ||
                    (cutoffHHMM !== null && slot.time <= cutoffHHMM);
      return { ...slot, taken, outsideHours: !withinHours };
    });
  }, [selectedBarber, form.date, bookedSlots, serviceDuration, minBookingNotice]);

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
    const capitalized = value.replace(/\b\w/g, c => c.toUpperCase());
    setSearchTerm(capitalized);
    set("client_name", capitalized);
    setShowDropdown(capitalized.length > 0);
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
      await refetchClients();
      setShowMergeDialog(false);
      toast.success("Existing client account linked successfully");
      // Proceed with the booking now that the client is resolved
      const mergedId = duplicateClient.id;
      setDuplicateClient(null);
      await buildAndSave(mergedId);
    } catch (error) {
      console.error("Error merging accounts:", error);
      toast.error("Failed to link client account");
    }
  };

  const buildAndSave = async (finalClientId) => {
    const baseBooking = {
      ...form,
      client_id: finalClientId || null,
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

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  ).slice(0, 5);

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
    if (!form.start_time) { toast.error("Please select a time slot."); return; }

    let finalClientId = form.client_id;

    if (!isBlockTime && !form.client_id) {
      // Check for a duplicate client on save — show merge dialog if found
      if (form.client_phone || form.client_email) {
        const duplicate = clients.find(c =>
          (form.client_phone && normalizePhone(c.phone) === normalizePhone(form.client_phone)) ||
          (form.client_email && c.email?.toLowerCase() === form.client_email.toLowerCase())
        );
        if (duplicate) {
          setDuplicateClient(duplicate);
          setShowMergeDialog(true);
          return; // booking proceeds only after user confirms merge
        }
      }

      // No duplicate — create a new client record if contact info was provided
      if (form.client_name && (form.client_email || form.client_phone)) {
        try {
          const newClient = await entities.Client.create({
            name: form.client_name,
            email: form.client_email || "",
            phone: form.client_phone || "",
          });
          finalClientId = newClient.id;
        } catch (error) {
          console.error("Error creating client:", error);
        }
      }
    }

    await buildAndSave(finalClientId);
  };

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">New Booking</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="relative" ref={dropdownRef}>
            <Label className="text-xs text-muted-foreground">Client Name *</Label>
            <Input 
              value={searchTerm} 
              onChange={e => handleNameChange(e.target.value)} 
              onFocus={() => setShowDropdown(searchTerm.length > 0)}
              placeholder="Start typing client name..." 
            />
            {showDropdown && filteredClients.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredClients.map(client => (
                  <button
                    key={client.id}
                    onClick={() => handleClientSelect(client)}
                    className="w-full px-3 py-2 text-left hover:bg-accent border-b border-border last:border-0"
                  >
                    <div className="font-medium text-sm">{client.name}</div>
                    <div className="text-xs text-muted-foreground">{client.phone} • {client.email}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <Input value={form.client_phone} onChange={e => handleContactChange("client_phone", e.target.value)} placeholder="(555) 123-4567" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input value={form.client_email} onChange={e => handleContactChange("client_email", e.target.value)} placeholder="email@example.com" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Barber *</Label>
            <Select value={form.barber_id} onValueChange={v => setForm(prev => ({ ...prev, barber_id: v, start_time: "" }))}>
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
            <Label className="text-xs text-muted-foreground">Service *</Label>
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

          <div>
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input type="date" value={form.date} onChange={e => { set("date", e.target.value); set("start_time", ""); }} />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Time</Label>
            {slots === null ? (
              <p className="text-xs text-muted-foreground py-3 text-center border border-dashed border-border rounded-md">
                Select a barber and date to see available times
              </p>
            ) : loadingSlots ? (
              <div className="flex justify-center py-4 border border-border rounded-md">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto rounded-md border border-border p-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {slots.map(({ time, label, taken, outsideHours }) => (
                    <button
                      key={time}
                      type="button"
                      disabled={taken && !outsideHours}
                      onClick={() => {
                        if (taken) return;
                        if (outsideHours) {
                          setPendingSlotTime(time);
                          setShowOutsideHoursWarning(true);
                        } else {
                          set("start_time", time);
                        }
                      }}
                      className={`py-2 rounded-md text-xs font-medium transition-colors border ${
                        form.start_time === time
                          ? "bg-[#B0BFA4] text-white border-[#8B9A7E]"
                          : taken
                          ? "opacity-40 cursor-not-allowed text-muted-foreground line-through border-border bg-muted/20"
                          : outsideHours
                          ? "opacity-50 border-dashed border-border bg-transparent text-muted-foreground hover:bg-amber-50 hover:border-amber-300 hover:opacity-80 cursor-pointer"
                          : "bg-card text-foreground border-border hover:bg-accent hover:border-[#B0BFA4] cursor-pointer"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedService && (
            <div className="bg-muted/30 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span>{serviceDuration} min {selectedBarber?.service_durations?.[form.service_id] && <span className="text-[10px] text-[#8B9A7E]">(custom)</span>}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price</span>
                <span>${servicePrice.toFixed(2)} {selectedBarber?.service_prices?.[form.service_id] !== undefined && <span className="text-[10px] text-[#8B9A7E]">(custom)</span>}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">End Time</span>
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
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-card shadow transition-transform ${repeatEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
              {repeatEnabled && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">Repeat Frequency</Label>
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
                    <Label className="text-xs text-muted-foreground">Repeat Until</Label>
                    <Input type="date" value={repeatEndDate} onChange={e => setRepeatEndDate(e.target.value)} min={form.date} />
                  </div>
                </>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs text-muted-foreground">Notes</Label>
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

      {/* Outside Working Hours Warning */}
      <Dialog open={showOutsideHoursWarning} onOpenChange={(open) => {
        if (!open) { setShowOutsideHoursWarning(false); setPendingSave(null); setPendingSlotTime(null); }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              Outside Working Hours
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This time is outside <strong>{selectedBarber?.name}</strong>&apos;s normal working hours. Are you sure you want to book outside their scheduled hours?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowOutsideHoursWarning(false);
              setPendingSave(null);
              setPendingSlotTime(null);
            }}>
              Cancel
            </Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={async () => {
              setShowOutsideHoursWarning(false);
              if (pendingSlotTime) {
                set("start_time", pendingSlotTime);
                setPendingSlotTime(null);
              } else if (pendingSave) {
                try { await doSave(pendingSave); } catch (err) { toast.error("Failed to save booking: " + (err.message || "Unknown error")); }
                setPendingSave(null);
              }
            }}>
              Book Anyway
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
            <p className="text-sm text-muted-foreground mb-4">
              A client with the same phone or email already exists:
            </p>
            {duplicateClient && (
              <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
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