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
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [duplicateClient, setDuplicateClient] = useState(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);

  const { data: clients = [], refetch: refetchClients } = useQuery({
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
    
    // Check for duplicates when phone or email is entered
    if (form.client_phone || form.client_email) {
      checkForDuplicates(value, form.client_phone, form.client_email);
    }
  };

  const handleContactChange = (field, value) => {
    set(field, value);
    if (form.client_name) {
      checkForDuplicates(form.client_name, field === "client_phone" ? value : form.client_phone, field === "client_email" ? value : form.client_email);
    }
  };

  const checkForDuplicates = (name, phone, email) => {
    const duplicate = clients.find(c => 
      c.id !== form.client_id && 
      ((phone && c.phone === phone) || (email && c.email === email))
    );
    if (duplicate) {
      setDuplicateClient(duplicate);
      setShowMergeDialog(true);
    }
  };

  const handleMergeAccounts = async () => {
    if (!duplicateClient) return;
    
    try {
      // Keep the newer account (current form), delete the older one
      await base44.entities.Client.delete(duplicateClient.id);
      
      // If the current form doesn't have a client_id, create new client with merged data
      if (!form.client_id) {
        const mergedClient = await base44.entities.Client.create({
          name: form.client_name,
          email: form.client_email || duplicateClient.email,
          phone: form.client_phone || duplicateClient.phone,
          staff_notes: duplicateClient.staff_notes || "",
          preferred_barber_ids: duplicateClient.preferred_barber_ids || [],
          preferred_service_ids: duplicateClient.preferred_service_ids || [],
          total_visits: duplicateClient.total_visits || 0,
          total_spent: duplicateClient.total_spent || 0,
        });
        setForm(prev => ({ ...prev, client_id: mergedClient.id }));
      }
      
      await refetchClients();
      setShowMergeDialog(false);
      setDuplicateClient(null);
    } catch (error) {
      console.error("Error merging accounts:", error);
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

  const endTime = selectedService
    ? format(addMinutes(parse(form.start_time, "HH:mm", new Date()), serviceDuration), "HH:mm")
    : "";

  const finalPrice = selectedService ? selectedService.price : 0;

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
              <Input value={form.client_phone} onChange={e => handleContactChange("client_phone", e.target.value)} placeholder="(555) 123-4567" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Email</Label>
              <Input value={form.client_email} onChange={e => handleContactChange("client_email", e.target.value)} placeholder="email@example.com" />
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

          {selectedService && (
            <div className="bg-[#0A0A0A] text-white rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm">Total</span>
              <span className="text-lg font-bold text-[#B0BFA4]">${finalPrice.toFixed(2)}</span>
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