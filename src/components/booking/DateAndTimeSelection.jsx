import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar, Clock, Loader2 } from "lucide-react";
import { format, addDays, isAfter, isBefore, startOfDay } from "date-fns";
import DayPicker from "react-day-picker";
import "react-day-picker/dist/style.css";

export default function DateAndTimeSelection({ client, barber, onSuccess, onBack }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState("");

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
  });

  const { data: existingBookings = [] } = useQuery({
    queryKey: ["bookings-for-barber", barber.id],
    queryFn: () => base44.entities.Booking.filter({ barber_id: barber.id }),
  });

  const { data: timeOffRequests = [] } = useQuery({
    queryKey: ["time-off", barber.id],
    queryFn: async () => {
      const requests = await base44.entities.TimeOffRequest.filter({ barber_id: barber.id });
      return requests.filter(r => r.status === "approved");
    },
  });

  // Determine which dates are bookable
  const disabledDates = useMemo(() => {
    const disabled = [];
    const today = startOfDay(new Date());
    const maxDate = addDays(today, 60);

    for (let i = 0; i <= 60; i++) {
      const date = addDays(today, i);
      const dateStr = format(date, "yyyy-MM-dd");

      // Check if day is off for this barber
      const dayName = format(date, "EEEE").toLowerCase();
      const barberHours = barber.hours?.[dayName];
      if (!barberHours || barberHours.off) {
        disabled.push(date);
        continue;
      }

      // Check if date is in time-off period
      const isTimeOff = timeOffRequests.some(r => {
        const startDate = new Date(r.start_date);
        const endDate = new Date(r.end_date);
        return isAfter(date, startDate) && isBefore(date, addDays(endDate, 1));
      });
      if (isTimeOff) {
        disabled.push(date);
      }
    }

    return disabled;
  }, [barber, timeOffRequests]);

  // Generate available time slots for selected date
  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];

    const dayName = format(selectedDate, "EEEE").toLowerCase();
    const barberHours = barber.hours?.[dayName];
    
    if (!barberHours || barberHours.off) return [];

    const slots = [];
    const [startH, startM] = (barberHours.start || "09:00").split(":").map(Number);
    const [endH, endM] = (barberHours.end || "18:00").split(":").map(Number);

    for (let h = startH; h <= endH; h++) {
      for (let m = 0; m < 60; m += 15) {
        if (h === endH && m >= endM) break;
        const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

        // Check if time is already booked
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const isBooked = existingBookings.some(b => {
          return b.date === dateStr && b.start_time <= time && b.end_time > time && b.status !== "cancelled";
        });

        if (!isBooked) {
          slots.push(time);
        }
      }
    }

    return slots;
  }, [selectedDate, barber, existingBookings]);

  const handleContinue = () => {
    if (selectedDate && selectedTime) {
      onSuccess({ date: format(selectedDate, "yyyy-MM-dd"), time: selectedTime });
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-lg font-semibold text-[#0A0A0A]">Choose Date & Time</h2>
            <p className="text-sm text-gray-500 mt-1">Booking with {barber.name}</p>
          </div>

          {/* Calendar */}
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4" /> Select Date
            </Label>
            <div className="border rounded-lg p-4 bg-white inline-block w-full">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={disabledDates}
                defaultMonth={new Date()}
                fromDate={new Date()}
                toDate={addDays(new Date(), 60)}
              />
            </div>
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4" /> Select Time
              </Label>
              {availableSlots.length === 0 ? (
                <p className="text-sm text-gray-500 p-4 text-center bg-gray-50 rounded">
                  No available times for this date
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setSelectedTime(slot)}
                      className={`p-2 text-sm rounded border transition ${
                        selectedTime === slot
                          ? "bg-[#8B9A7E] text-white border-[#8B9A7E]"
                          : "bg-white border-gray-200 hover:border-[#8B9A7E]"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleContinue}
            disabled={!selectedDate || !selectedTime}
            className="w-full bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white h-11"
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    </>
  );
}