import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar, Clock, User, Check, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";

export default function ClientBooking() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clientId = localStorage.getItem("clientId");

  const [selectedBarber, setSelectedBarber] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedTime, setSelectedTime] = useState("");

  const { data: client } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const clients = await base44.entities.Client.filter({ id: clientId });
      return clients[0] || null;
    },
    enabled: !!clientId,
  });

  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => base44.entities.Barber.list(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
  });

  const { data: shopSettings = [] } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => base44.entities.ShopSettings.list(),
  });

  const { data: existingBookings = [] } = useQuery({
    queryKey: ["bookings-for-slot", selectedDate, selectedBarber],
    queryFn: async () => {
      if (!selectedBarber || !selectedDate) return [];
      return await base44.entities.Booking.filter({ 
        barber_id: selectedBarber, 
        date: selectedDate 
      });
    },
    enabled: !!selectedBarber && !!selectedDate,
  });

  const createBooking = useMutation({
    mutationFn: (data) => base44.entities.Booking.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking confirmed!");
      navigate(createPageUrl("ClientPortal"));
    },
  });

  const selectedServiceData = services.find(s => s.id === selectedService);
  const selectedBarberData = barbers.find(b => b.id === selectedBarber);

  // Generate available time slots
  const availableSlots = useMemo(() => {
    if (!selectedBarber || !selectedDate) return [];

    const barber = barbers.find(b => b.id === selectedBarber);
    const dayName = format(new Date(selectedDate), "EEEE").toLowerCase();
    const barberHours = barber?.hours?.[dayName];
    
    if (!barberHours || barberHours.off) return [];

    const slots = [];
    const [startH, startM] = (barberHours.start || "09:00").split(":").map(Number);
    const [endH, endM] = (barberHours.end || "18:00").split(":").map(Number);

    for (let h = startH; h <= endH; h++) {
      for (let m = 0; m < 60; m += 15) {
        if (h === endH && m >= endM) break;
        const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        
        // Check if slot is already booked
        const isBooked = existingBookings.some(b => {
          return b.start_time <= time && b.end_time > time && b.status !== "cancelled";
        });

        if (!isBooked) {
          slots.push(time);
        }
      }
    }

    return slots;
  }, [selectedBarber, selectedDate, barbers, existingBookings]);

  const handleBooking = () => {
    if (!selectedBarber || !selectedService || !selectedDate || !selectedTime) {
      toast.error("Please fill in all fields");
      return;
    }

    const service = services.find(s => s.id === selectedService);
    const barber = barbers.find(b => b.id === selectedBarber);
    
    const [h, m] = selectedTime.split(":").map(Number);
    const endTime = new Date(2000, 0, 1, h, m + service.duration);
    const endTimeStr = `${String(endTime.getHours()).padStart(2, "0")}:${String(endTime.getMinutes()).padStart(2, "0")}`;

    createBooking.mutate({
      client_name: client.name,
      client_phone: client.phone,
      client_email: client.email,
      barber_id: barber.id,
      barber_name: barber.name,
      service_id: service.id,
      service_name: service.name,
      date: selectedDate,
      start_time: selectedTime,
      end_time: endTimeStr,
      duration: service.duration,
      price: service.price,
      final_price: service.price,
      status: "scheduled",
      payment_method: "cash",
      discount_type: "none",
      discount_value: 0,
    });
  };

  if (!client) {
    return (
      <div className="p-4">
        <Link to={createPageUrl("ClientPortal")}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Portal
          </Button>
        </Link>
        <p className="text-center text-gray-500">Please log in to book an appointment</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAFAF8] to-[#F5F3EE] p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link to={createPageUrl("ClientPortal")}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
          <h1 className="text-lg font-bold">Book Appointment</h1>
          <div className="w-20" />
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Step 1: Select Barber */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4" /> Select Barber
              </Label>
              <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your barber" />
                </SelectTrigger>
                <SelectContent>
                  {barbers.filter(b => b.is_active).map(barber => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name} - {barber.tier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Select Service */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Check className="w-4 h-4" /> Select Service
              </Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.filter(s => s.is_active).map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - ${service.price} ({service.duration}min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 3: Select Date */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4" /> Select Date
              </Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
                max={format(addDays(new Date(), 60), "yyyy-MM-dd")}
              />
            </div>

            {/* Step 4: Select Time */}
            {selectedBarber && selectedDate && (
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4" /> Select Time
                </Label>
                {availableSlots.length === 0 ? (
                  <p className="text-sm text-gray-500 p-4 text-center bg-gray-50 rounded">
                    No available slots for this date
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {availableSlots.map(slot => (
                      <button
                        key={slot}
                        onClick={() => setSelectedTime(slot)}
                        className={`p-2 text-sm rounded border transition ${
                          selectedTime === slot
                            ? "bg-[#C9A94E] text-white border-[#C9A94E]"
                            : "bg-white border-gray-200 hover:border-[#C9A94E]"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            {selectedServiceData && selectedBarberData && selectedDate && selectedTime && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-3">Booking Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Service:</span>
                    <span className="font-medium">{selectedServiceData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Barber:</span>
                    <span className="font-medium">{selectedBarberData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date:</span>
                    <span className="font-medium">{format(new Date(selectedDate), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Time:</span>
                    <span className="font-medium">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold text-[#C9A94E]">${selectedServiceData.price}</span>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={handleBooking}
              disabled={!selectedBarber || !selectedService || !selectedDate || !selectedTime || createBooking.isPending}
              className="w-full bg-[#C9A94E] hover:bg-[#A07D2B] h-11"
            >
              {createBooking.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Booking...
                </>
              ) : (
                "Confirm Booking"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}