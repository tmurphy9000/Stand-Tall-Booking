import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AppointmentBooking({ client, barber, dateTime, onSuccess, onBack }) {
  const [selectedService, setSelectedService] = useState("");

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
  });

  const createBooking = useMutation({
    mutationFn: (data) => base44.entities.Booking.create(data),
    onSuccess: (newBooking) => {
      toast.success("Booking created!");
      onSuccess(newBooking);
    },
  });

  const selectedServiceData = services.find(s => s.id === selectedService);

  const handleBooking = () => {
    if (!selectedService) {
      toast.error("Please select a service");
      return;
    }

    const service = services.find(s => s.id === selectedService);
    
    const [h, m] = dateTime.time.split(":").map(Number);
    const endTime = new Date(2000, 0, 1, h, m + service.duration);
    const endTimeStr = `${String(endTime.getHours()).padStart(2, "0")}:${String(endTime.getMinutes()).padStart(2, "0")}`;

    createBooking.mutate({
      client_name: client.name,
      client_phone: client.phone,
      client_email: client.email,
      client_id: client.id,
      barber_id: barber.id,
      barber_name: barber.name,
      service_id: service.id,
      service_name: service.name,
      date: dateTime.date,
      start_time: dateTime.time,
      end_time: endTimeStr,
      duration: service.duration,
      price: service.price,
      final_price: service.price,
      status: "scheduled",
      payment_method: "cash",
      discount_type: "none",
      discount_value: 0,
      visit_type: "NR",
    });
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-lg font-semibold text-[#0A0A0A]">Choose Service</h2>
            <p className="text-sm text-gray-500 mt-1">Booking with {barber.name}</p>
          </div>

          {/* Service Selection */}
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

          {/* Summary */}
          {selectedServiceData && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-3">Booking Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Service:</span>
                  <span className="font-medium">{selectedServiceData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Barber:</span>
                  <span className="font-medium">{barber.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date:</span>
                  <span className="font-medium">{format(new Date(dateTime.date), "MMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Time:</span>
                  <span className="font-medium">{dateTime.time}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold text-[#8B9A7E]">${selectedServiceData.price}</span>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleBooking}
            disabled={!selectedService || createBooking.isPending}
            className="w-full bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white h-11"
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
    </>
  );
}