import React, { useState, useRef, useCallback, useEffect } from "react";
import { format, parse, addMinutes, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

const BASE_SLOT_HEIGHT = 20;
const SLOT_MINUTES = 15;

function generateTimeSlots(startHour = 8, endHour = 21) {
  const slots = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const displayLabel = format(new Date(2000, 0, 1, h, m), m === 0 ? "h a" : "h:mm");
      slots.push({
        time: timeStr,
        hour: h,
        minute: m,
        label: displayLabel,
        isHour: m === 0,
      });
    }
  }
  return slots;
}

function isSlotBookable(time, barberHours, shopHours, dayName) {
  // Enforce shop hours only when they are explicitly configured for this day
  if (shopHours?.[dayName]) {
    if (shopHours[dayName].closed) return false;
    const shopStart = shopHours[dayName].start || "08:00";
    const shopEnd = shopHours[dayName].end || "21:00";
    if (time < shopStart || time >= shopEnd) return false;
  }

  // Enforce barber hours when configured
  if (barberHours?.[dayName]) {
    const day = barberHours[dayName];
    if (day.off || day.closed) return false;
    const bStart = day.start || "08:00";
    const bEnd = day.end || "21:00";
    if (time < bStart || time >= bEnd) return false;
  } else if (barberHours && Object.keys(barberHours).length > 0) {
    // Barber has a schedule but this day is not in it — treat as day off
    return false;
  }

  return true;
}

function BookingBlock({ booking, slotIndex, totalSlots, onContextMenu, onDragStart, slotHeight, onResize }) {
  const durationSlots = Math.ceil((booking.duration || 30) / SLOT_MINUTES);
  const height = durationSlots * slotHeight - 2;
  const [showHandles, setShowHandles] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const statusColors = {
    scheduled: "bg-purple-100 border-purple-500 text-purple-800",
    confirmed: "bg-green-100 border-green-500 text-green-800",
    checked_in: "bg-yellow-100 border-yellow-500 text-yellow-800",
    completed: "bg-gray-200 border-gray-400 text-gray-600",
    cancelled: "bg-red-50 border-red-300 text-red-400 line-through",
    no_show: "bg-orange-50 border-orange-300 text-orange-500",
  };

  const handleResizeStart = (e, direction) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    
    const startY = e.clientY;
    const startDuration = booking.duration || 30;
    
    const handleMouseMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const slotsChanged = Math.round(deltaY / slotHeight);
      const newDuration = direction === 'top' 
        ? Math.max(15, startDuration - (slotsChanged * SLOT_MINUTES))
        : Math.max(15, startDuration + (slotsChanged * SLOT_MINUTES));
      
      if (newDuration !== startDuration && onResize) {
        onResize(booking, newDuration, direction);
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        if (isResizing) {
          e.preventDefault();
          return;
        }
        onDragStart(e, booking);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onContextMenu(e, booking);
      }}
      onMouseEnter={() => setShowHandles(true)}
      onMouseLeave={() => !isResizing && setShowHandles(false)}
      className={cn(
        "booking-card absolute left-0.5 right-0.5 rounded-md border-l-[3px] px-1 py-0.5 overflow-hidden z-10",
        statusColors[booking.status] || statusColors.scheduled
      )}
      style={{ top: 0, height }}
    >
      {/* Top resize handle */}
      {showHandles && (
        <div
          onMouseDown={(e) => handleResizeStart(e, 'top')}
          className="absolute -top-1 left-1 w-4 h-4 bg-white border border-gray-400 rounded-full cursor-ns-resize z-20 shadow-sm hover:scale-110 transition-transform"
        />
      )}
      
      <div className="flex items-start justify-between gap-0.5">
        <p className="text-[10px] font-semibold truncate leading-tight flex-1">{booking.client_name}</p>
        {booking.visit_type && (
          <span className="text-[8px] font-bold opacity-70 flex-shrink-0 leading-tight mt-0.5">{booking.visit_type}</span>
        )}
      </div>
      <p className="text-[9px] truncate opacity-75">{booking.service_name}</p>
      <p className="text-[9px] opacity-60">{booking.start_time} - {booking.end_time}</p>
      
      {/* Bottom resize handle */}
      {showHandles && (
        <div
          onMouseDown={(e) => handleResizeStart(e, 'bottom')}
          className="absolute -bottom-1 right-1 w-4 h-4 bg-white border border-gray-400 rounded-full cursor-ns-resize z-20 shadow-sm hover:scale-110 transition-transform"
        />
      )}
    </div>
  );
}

const MIN_COLUMN_WIDTH = 60;
const MAX_COLUMN_WIDTH = 200;

export default function TimeSlotGrid({ barbers, bookings, date, shopHours, onSlotClick, onBookingContext, onDrop, onBookingResize, zoomLevel = 1 }) {
  const containerRef = React.useRef(null);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [columnZoom, setColumnZoom] = useState(1);
  const pinchRef = useRef({ initialDistance: null, initialZoom: 1 });

  React.useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Horizontal pinch-to-zoom handlers
  const getHorizontalPinchDistance = (touches) => Math.abs(touches[0].clientX - touches[1].clientX);

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      pinchRef.current = {
        initialDistance: getHorizontalPinchDistance(e.touches),
        initialZoom: columnZoom,
      };
    }
  }, [columnZoom]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && pinchRef.current.initialDistance) {
      const currentDistance = getHorizontalPinchDistance(e.touches);
      const scale = currentDistance / pinchRef.current.initialDistance;
      const newZoom = Math.max(0.5, Math.min(3, pinchRef.current.initialZoom * scale));
      setColumnZoom(prev => {
        // Smooth by interpolating towards target
        const target = Math.max(0.5, Math.min(3, pinchRef.current.initialZoom * scale));
        return prev + (target - prev) * 0.3;
      });
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    pinchRef.current.initialDistance = null;
  }, []);

  const TIME_LABEL_WIDTH = 56; // w-14
  const availableWidth = containerWidth - TIME_LABEL_WIDTH;
  const baseColumnWidth = barbers.length > 0 && availableWidth > 0
    ? Math.max(MIN_COLUMN_WIDTH, Math.floor(availableWidth / barbers.length))
    : 140;
  const COLUMN_WIDTH = Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, Math.floor(baseColumnWidth * columnZoom)));
  const slotHeight = BASE_SLOT_HEIGHT * zoomLevel;
  const timeSlots = generateTimeSlots(7, 22);
  const dayName = format(date, "EEEE").toLowerCase();
  const dateStr = format(date, "yyyy-MM-dd");
  const gridRef = useRef(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const isToday = isSameDay(date, now);
  const currentTimeTop = isToday
    ? ((now.getHours() - 7) * 60 + now.getMinutes()) / SLOT_MINUTES * slotHeight
    : null;

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
    <div
      ref={containerRef}
      className="flex-1 flex flex-col overflow-hidden relative"
      style={{ minHeight: 0 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Column width slider bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FAFAF8] border-b border-gray-100">
        <span className="text-[9px] text-gray-400 flex-shrink-0">↔</span>
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.05}
          value={columnZoom}
          onChange={(e) => setColumnZoom(parseFloat(e.target.value))}
          className="flex-1 h-1 accent-[#8B9A7E] cursor-pointer"
          style={{ accentColor: '#8B9A7E' }}
        />
        <span className="text-[9px] text-gray-400 flex-shrink-0">↔</span>
      </div>
    <div ref={gridRef} className="overflow-auto flex-1">
      <div className="inline-block min-w-full relative">
        {/* Barber header columns */}
        <div className="sticky top-0 z-20 bg-[#FAFAF8] flex border-b border-gray-100">
          <div className="w-14 flex-shrink-0" />
          {barbers.map((barber) => {
            const barberAppointmentCount = bookings.filter(
              b => b.barber_id === barber.id && 
              b.date === dateStr && 
              b.status !== "cancelled"
            ).length;
            
            return (
              <div key={barber.id} className="px-1 py-1 text-center border-l border-gray-50" style={{ width: `${COLUMN_WIDTH}px`, minWidth: `${COLUMN_WIDTH}px` }}>
                <div className="flex flex-col items-center gap-0.5">
                  {barber.photo_url ? (
                    <img src={barber.photo_url} alt={barber.name} className="w-5 h-5 rounded-full object-cover ring-1 ring-[#8B9A7E]/30" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[#8B9A7E] flex items-center justify-center text-[#FAFAF8] text-[9px] font-bold">
                      {barber.name?.charAt(0)}
                    </div>
                  )}
                  <div className="flex items-center gap-0.5">
                    <span className="text-[9px] font-medium text-gray-700 truncate max-w-full">{barber.name.split(' ')[0]}</span>
                    <span className="text-[8px] font-bold text-[#8B9A7E] bg-[#8B9A7E]/10 px-1 py-0.5 rounded-full">
                      {barberAppointmentCount}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current time indicator */}
        {currentTimeTop !== null && currentTimeTop > 0 && (
          <div
            className="absolute left-0 right-0 z-30 pointer-events-none"
            style={{ top: `${currentTimeTop + 40}px` }} // 40px offset for sticky header
          >
            <div className="flex items-center">
              <div className="w-14 flex-shrink-0 flex justify-end pr-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
              </div>
              <div className="flex-1 h-[1.5px] bg-red-500" />
            </div>
          </div>
        )}

        {/* Time grid */}
        {timeSlots.map((slot, i) => {
          return (
            <div key={slot.time} className="flex">
              <div className="w-14 flex-shrink-0 pr-2 text-right">
                <span className={cn(
                  "text-[10px] leading-none relative -top-1.5",
                  slot.isHour ? "text-gray-600 font-bold" : "text-gray-400"
                )}>
                  {slot.label}
                </span>
              </div>
              {barbers.map((barber) => {
                const bookable = isSlotBookable(slot.time, barber.hours, shopHours, dayName);
                const slotBookings = getBookingsForBarberSlot(barber.id, slot.time);
                const isDragOver = dragOverSlot === `${barber.id}-${slot.time}`;

                return (
                  <div
                    key={`${barber.id}-${slot.time}`}
                    className={cn(
                      "calendar-slot border-l border-b border-gray-50 relative",
                      !bookable && "bg-gray-200/80",
                      bookable && "hover:bg-[#8B9A7E]/5 cursor-pointer",
                      slot.minute === 0 && "border-t border-gray-200/50",
                      isDragOver && bookable && "bg-[#8B9A7E]/10"
                    )}
                    style={{ width: `${COLUMN_WIDTH}px`, minWidth: `${COLUMN_WIDTH}px`, height: `${slotHeight}px` }}
                    onClick={(e) => bookable && onSlotClick(e, barber, slot.time, dateStr)}
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
                        onResize={onBookingResize}
                        slotHeight={slotHeight}
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
    </div>
  );
}