import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserX, Phone } from "lucide-react";
import { format, addMinutes, parse } from "date-fns";

export default function QuickBookingModal({ open, onClose, onSave, barbers, services, prefill, bookings = [] }) {
  const [step, setStep] = useState("type"); // "type" or "service"
  const [bookingType, setBookingType] = useState(null); // "walk-in" or "call-in"
  const [showOutsideHoursWarning, setShowOutsideHoursWarning] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);

  const handleTypeSelect = (type) => {
    setBookingType(type);
    setStep("service");
  };

  const isOutsideBookableHours = (barber, startTime, date) => {
    if (!barber || !startTime || !date) return false;
    const dayName = format(new Date(date + "T12:00:00"), "EEEE").toLowerCase();
    const dayHours = barber.hours?.[dayName];
    if (!dayHours || dayHours.off) return false;
    const { start, end } = dayHours;
    if (!start || !end) return false;
    return startTime < start || startTime >= end;
  };

  const handleServiceSelect = (service) => {
    const selectedBarber = barbers.find(b => b.id === prefill.barber_id);
    const serviceDuration = selectedBarber?.service_durations?.[service.id] || service.duration || 30;
    const servicePrice = selectedBarber?.service_prices?.[service.id] ?? service.price;
    const endTime = format(addMinutes(parse(prefill.start_time, "HH:mm", new Date()), serviceDuration), "HH:mm");

    const booking = {
      client_name: bookingType === "walk-in" ? "Walk-in" : "Call-in",
      client_phone: "",
      client_email: "",
      client_id: "",
      barber_id: prefill.barber_id,
      barber_name: selectedBarber?.name || "",
      service_id: service.id,
      service_name: service.name,
      date: prefill.date,
      start_time: prefill.start_time,
      end_time: endTime,
      duration: serviceDuration,
      price: servicePrice,
      final_price: servicePrice,
      status: "scheduled",
      notes: bookingType === "walk-in" ? "Walk-in appointment" : "Call-in appointment",
      visit_type: "NNR",
    };

    if (isOutsideBookableHours(selectedBarber, prefill.start_time, prefill.date)) {
      setPendingBooking(booking);
      setShowOutsideHoursWarning(true);
      return;
    }

    onSave(booking);
    handleClose();
  };

  const handleClose = () => {
    setStep("type");
    setBookingType(null);
    setShowOutsideHoursWarning(false);
    setPendingBooking(null);
    onClose();
  };

  return (
    <>
    <Dialog open={showOutsideHoursWarning} onOpenChange={() => { setShowOutsideHoursWarning(false); setPendingBooking(null); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Outside Bookable Hours</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600 py-2">
          This appointment is outside of bookable hours. Do you want to continue?
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowOutsideHoursWarning(false); setPendingBooking(null); }}>
            No, Cancel
          </Button>
          <Button className="bg-[#B0BFA4] hover:bg-[#8B9A7E] text-white" onClick={() => { onSave(pendingBooking); handleClose(); }}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "type" ? "New Booking" : "Select Service"}
          </DialogTitle>
        </DialogHeader>

        {step === "type" && (
          <div className="py-4 space-y-3">
            <Button
              onClick={() => handleTypeSelect("walk-in")}
              className="w-full h-24 bg-blue-50 hover:bg-blue-100 text-blue-700 border-2 border-blue-200 flex flex-col gap-2"
              variant="outline"
            >
              <UserX className="w-8 h-8" />
              <span className="text-lg font-semibold">Walk-in</span>
            </Button>
            <Button
              onClick={() => handleTypeSelect("call-in")}
              className="w-full h-24 bg-green-50 hover:bg-green-100 text-green-700 border-2 border-green-200 flex flex-col gap-2"
              variant="outline"
            >
              <Phone className="w-8 h-8" />
              <span className="text-lg font-semibold">Call-in</span>
            </Button>
          </div>
        )}

        {step === "service" && (
          <div className="py-4 space-y-2 max-h-96 overflow-y-auto">
            {services.filter(s => {
              if (s.is_active === false) return false;
              const selectedBarber = barbers.find(b => b.id === prefill.barber_id);
              if (!selectedBarber) return true;
              const availableServices = selectedBarber.available_services;
              if (!availableServices || availableServices.length === 0) return true;
              return availableServices.includes(s.id);
            }).map(service => {
              const selectedBarber = barbers.find(b => b.id === prefill.barber_id);
              const customDuration = selectedBarber?.service_durations?.[service.id];
              const customPrice = selectedBarber?.service_prices?.[service.id];
              const displayDuration = customDuration || service.duration;
              const displayPrice = customPrice ?? service.price;
              
              return (
                <Button
                  key={service.id}
                  onClick={() => handleServiceSelect(service)}
                  className="w-full h-auto py-4 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 justify-between"
                  variant="outline"
                >
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">{service.name}</span>
                    <span className="text-xs text-gray-500">
                      {displayDuration} min
                      {(customDuration || customPrice !== undefined) && <span className="text-[#8B9A7E] ml-1">(custom)</span>}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-[#8B9A7E]">${displayPrice}</span>
                </Button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}