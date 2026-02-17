import React, { useState, useRef, useCallback } from "react";
import { format, parse, addMinutes, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

const SLOT_HEIGHT = 20;
const SLOT_MINUTES = 15;

function generateTimeSlots(startHour = 8, endHour = 21) {
  const slots = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      slots.push({
        time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        hour: h,
        minute: m,
        label: m === 0 ? format(new Date(2000, 0, 1, h, 0), "h a") : "",
      });
    }
  }
  return slots;
}

function isSlotBookable(time, barberHours, shopHours, dayName) {
  if (!shopHours || !shopHours[dayName] || shopHours[dayName].closed) return false;
  const shopStart = shopHours[dayName]?.start || "08:00";
  const shopEnd = shopHours[dayName]?.end || "21:00";
  if (time < shopStart || time >= shopEnd) return false;

  if (barberHours && barberHours[dayName]) {
    if (barberHours[dayName].off) return false;
    const bStart = barberHours[dayName].start || shopStart;
    const bEnd = barberHours[dayName].end || shopEnd;
    if (time < bStart || time >= bEnd) return false;
  }
  return true;
}

function BookingBlock({ booking, slotIndex, totalSlots, onContextMenu, onDragStart }) {
  const durationSlots = Math.ceil((booking.duration || 30) / SLOT_MINUTES);
  const height = durationSlots * SLOT_HEIGHT - 2;

  const statusColors = {
    scheduled: "bg-[#C9A94E]/15 border-[#C9A94E] text-[#8B7023]",
    confirmed: "bg-blue-50 border-blue-400 text-blue-700",
    checked_in: "bg-green-50 border-green-400 text-green-700",
    completed: "bg-gray-50 border-gray-300 text-gray-500",
    cancelled: "bg-red-50 border-red-300 text-red-400 line-through",
    no_show: "bg-orange-50 border-orange-300 text-orange-500",
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, booking)}
      onContextMenu={(e) => onContextMenu(e, booking)}
      className={cn(
        "booking-card absolute left-0.5 right-0.5 rounded-md border-l-[3px] px-1.5 py-0.5 overflow-hidden z-10",
        statusColors[booking.status] || statusColors.scheduled
      )}
      style={{ top: 0, height }}
    >
      <p className="text-[10px] font-semibold truncate leading-tight">{booking.client_name}</p>
      <p className="text-[9px] truncate opacity-75">{booking.service_name}</p>
      <p className="text-[9px] opacity-60">{booking.start_time} - {booking.end_time}</p>
    </div>
  );
}

export default function TimeSlotGrid({ barbers, bookings, date, shopHours, onSlotClick, onBookingContext, onDrop }) {
  const timeSlots = generateTimeSlots(7, 22);
  const dayName = format(date, "EEEE").toLowerCase();
  const dateStr = format(date, "yyyy-MM-dd");
  const gridRef = useRef(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);

  const getBookingsForBarberSlot = useCallback((barberId, time) => {
    return bookings.filter(b =>
      b.barber_id === barberId &&
      b.date === dateStr &&
      b.start_time === time &&
      b.status !== "cancelled"
    );
  }, [bookings, dateStr]);

  const handleDragOver = (e, barberId, time) => {
    e.preventDefault();
    setDragOverSlot(`${barberId}-${time}`);
  };

  const handleDrop = (e, barberId, time) => {
    e.preventDefault();
    setDragOverSlot(null);
    const bookingId = e.dataTransfer.getData("bookingId");
    if (bookingId && onDrop) {
      onDrop(bookingId, barberId, dateStr, time);
    }
  };

  const handleDragStart = (e, booking) => {
    e.dataTransfer.setData("bookingId", booking.id);
  };

  return (
    <div ref={gridRef} className="overflow-auto flex-1">
      <div className="min-w-[600px]">
        {/* Barber header columns */}
        <div className="sticky top-0 z-20 bg-[#FAFAF8] flex border-b border-gray-100">
          <div className="w-14 flex-shrink-0" />
          {barbers.map((barber) => (
            <div key={barber.id} className="flex-1 min-w-[120px] px-2 py-2 text-center border-l border-gray-50">
              <div className="flex flex-col items-center gap-1">
                {barber.photo_url ? (
                  <img src={barber.photo_url} alt={barber.name} className="w-7 h-7 rounded-full object-cover ring-2 ring-[#C9A94E]/30" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C9A94E] to-[#A07D2B] flex items-center justify-center text-white text-[10px] font-bold">
                    {barber.name?.charAt(0)}
                  </div>
                )}
                <span className="text-[10px] font-medium text-gray-700 truncate max-w-full">{barber.name}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        {timeSlots.map((slot, i) => {
          return (
            <div key={slot.time} className="flex">
              <div className="w-14 flex-shrink-0 pr-2 text-right">
                {slot.label && (
                  <span className="text-[10px] text-gray-400 leading-none relative -top-1.5">{slot.label}</span>
                )}
              </div>
              {barbers.map((barber) => {
                const bookable = isSlotBookable(slot.time, barber.hours, shopHours, dayName);
                const slotBookings = getBookingsForBarberSlot(barber.id, slot.time);
                const isDragOver = dragOverSlot === `${barber.id}-${slot.time}`;

                return (
                  <div
                    key={`${barber.id}-${slot.time}`}
                    className={cn(
                      "calendar-slot flex-1 min-w-[120px] border-l border-b border-gray-50 relative",
                      !bookable && "bg-gray-100/50",
                      bookable && "hover:bg-[#C9A94E]/5 cursor-pointer",
                      slot.minute === 0 && "border-t border-gray-200/50",
                      isDragOver && bookable && "bg-[#C9A94E]/10"
                    )}
                    onClick={() => bookable && onSlotClick(barber, slot.time, dateStr)}
                    onDragOver={(e) => bookable && handleDragOver(e, barber.id, slot.time)}
                    onDragLeave={() => setDragOverSlot(null)}
                    onDrop={(e) => bookable && handleDrop(e, barber.id, slot.time)}
                  >
                    {slotBookings.map((booking) => (
                      <BookingBlock
                        key={booking.id}
                        booking={booking}
                        slotIndex={i}
                        totalSlots={timeSlots.length}
                        onContextMenu={onBookingContext}
                        onDragStart={handleDragStart}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}