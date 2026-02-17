import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, startOfWeek } from "date-fns";
import CalendarHeader from "../components/calendar/CalendarHeader";
import TimeSlotGrid from "../components/calendar/TimeSlotGrid";
import BookingFormModal from "../components/calendar/BookingFormModal";
import BookingContextMenu from "../components/calendar/BookingContextMenu";
import { Loader2 } from "lucide-react";

const BARBERS_PER_GROUP = 5;

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("day");
  const [barberGroupIndex, setBarberGroupIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingPrefill, setBookingPrefill] = useState(null);
  const [contextMenu, setContextMenu] = useState({ booking: null, position: { x: 0, y: 0 } });
  const [initialPinchDistance, setInitialPinchDistance] = useState(null);
  const [initialZoomLevel, setInitialZoomLevel] = useState(1);

  const queryClient = useQueryClient();

  const { data: barbers = [], isLoading: barbersLoading } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => base44.entities.Barber.list(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
  });

  const { data: shopSettingsArr = [] } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => base44.entities.ShopSettings.list(),
  });
  const shopSettings = shopSettingsArr[0] || {};

  const dateRange = useMemo(() => {
    if (viewMode === "day") return [format(currentDate, "yyyy-MM-dd")];
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), "yyyy-MM-dd"));
  }, [currentDate, viewMode]);

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings", dateRange[0], dateRange[dateRange.length - 1]],
    queryFn: async () => {
      const all = await base44.entities.Booking.list("-date", 500);
      return all.filter(b => b.date >= dateRange[0] && b.date <= dateRange[dateRange.length - 1]);
    },
  });

  const createBooking = useMutation({
    mutationFn: (data) => base44.entities.Booking.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setShowBookingForm(false);
    },
  });

  const updateBooking = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Booking.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });

  // Group barbers for display
  const activeBarbers = barbers.filter(b => b.is_active !== false);
  const totalGroups = Math.max(1, Math.ceil(activeBarbers.length / BARBERS_PER_GROUP));
  const visibleBarbers = activeBarbers.slice(
    barberGroupIndex * BARBERS_PER_GROUP,
    (barberGroupIndex + 1) * BARBERS_PER_GROUP
  );

  const handleSlotClick = (barber, time, date) => {
    setBookingPrefill({ barber_id: barber.id, start_time: time, date });
    setShowBookingForm(true);
  };

  const handleBookingContext = (e, booking) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ booking, position: { x: Math.min(e.clientX, window.innerWidth - 200), y: Math.min(e.clientY, window.innerHeight - 250) } });
  };

  const handleContextAction = (action, bookingId, extra) => {
    const statusMap = { confirm: "confirmed", checked_in: "checked_in", completed: "completed", cancel: "cancelled" };
    const data = { status: statusMap[action] || action };
    if (extra?.cancel_reason) data.cancel_reason = extra.cancel_reason;
    updateBooking.mutate({ id: bookingId, data });
  };

  const handleDrop = (bookingId, barberId, date, time) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    const service = services.find(s => s.id === booking.service_id);
    const duration = service?.duration || booking.duration || 30;
    const [h, m] = time.split(":").map(Number);
    const endDate = new Date(2000, 0, 1, h, m + duration);
    const end_time = format(endDate, "HH:mm");

    updateBooking.mutate({
      id: bookingId,
      data: {
        barber_id: barberId,
        barber_name: activeBarbers.find(b => b.id === barberId)?.name || booking.barber_name,
        date,
        start_time: time,
        end_time,
      },
    });
  };

  const isLoading = barbersLoading || bookingsLoading;

  const getTouchDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const distance = getTouchDistance(e.touches);
      setInitialPinchDistance(distance);
      setInitialZoomLevel(zoomLevel);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && initialPinchDistance) {
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / initialPinchDistance;
      const newZoom = Math.max(0.5, Math.min(3, initialZoomLevel * scale));
      setZoomLevel(newZoom);
    }
  };

  const handleTouchEnd = () => {
    setInitialPinchDistance(null);
  };

  return (
    <div 
      className="flex flex-col h-[calc(100vh-120px)]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <CalendarHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onNewBooking={() => { setBookingPrefill(null); setShowBookingForm(true); }}
        barberGroupIndex={barberGroupIndex}
        setBarberGroupIndex={setBarberGroupIndex}
        totalBarberGroups={totalGroups}
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
      />

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#8B9A7E]" />
        </div>
      ) : viewMode === "day" ? (
        <TimeSlotGrid
          barbers={visibleBarbers}
          bookings={bookings}
          date={currentDate}
          shopHours={shopSettings.operating_hours}
          onSlotClick={handleSlotClick}
          onBookingContext={handleBookingContext}
          onDrop={handleDrop}
          zoomLevel={zoomLevel}
        />
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="flex">
            {dateRange.map(dateStr => (
              <div key={dateStr} className="min-w-[300px] flex-1 border-r border-gray-100">
                <div className="sticky top-0 bg-[#FAFAF8] px-3 py-2 border-b border-gray-100 text-center">
                  <p className="text-xs font-semibold">{format(new Date(dateStr + "T12:00:00"), "EEE")}</p>
                  <p className="text-[10px] text-gray-400">{format(new Date(dateStr + "T12:00:00"), "MMM d")}</p>
                </div>
                <div className="p-2 space-y-1">
                  {bookings.filter(b => b.date === dateStr && b.status !== "cancelled").map(b => (
                    <div
                      key={b.id}
                      onClick={(e) => handleBookingContext(e, b)}
                      className="bg-white rounded-lg border border-gray-100 p-2 cursor-pointer hover:border-[#8B9A7E]/30 transition-all"
                    >
                      <p className="text-[10px] font-semibold">{b.client_name}</p>
                      <p className="text-[9px] text-gray-400">{b.barber_name} • {b.start_time} - {b.end_time}</p>
                      <p className="text-[9px] text-[#8B9A7E]">{b.service_name}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <BookingFormModal
        open={showBookingForm}
        onClose={() => setShowBookingForm(false)}
        onSave={(data) => createBooking.mutate(data)}
        barbers={activeBarbers}
        services={services}
        prefill={bookingPrefill}
      />

      <BookingContextMenu
        booking={contextMenu.booking}
        position={contextMenu.position}
        onClose={() => setContextMenu({ booking: null, position: { x: 0, y: 0 } })}
        onAction={handleContextAction}
      />
    </div>
  );
}