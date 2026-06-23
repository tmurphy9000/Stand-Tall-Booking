import React, { useState, useMemo, useEffect } from "react";
import { entities } from "@/api/entities";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, startOfWeek } from "date-fns";
import CalendarHeader from "../components/calendar/CalendarHeader";
import TimeSlotGrid from "../components/calendar/TimeSlotGrid";
import BookingFormModal from "../components/calendar/BookingFormModal";
import QuickBookingModal from "../components/calendar/QuickBookingModal";
import BookingContextMenu from "../components/calendar/BookingContextMenu";
import { Loader2, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import BarberAssistant from "../components/assistant/BarberAssistant";
import LeaderboardCard from "../components/calendar/LeaderboardCard";
import CheckoutModal from "../components/checkout/CheckoutModal";
import { useIsMobile } from "../hooks/use-mobile";
import { useAuth } from "../lib/AuthContext";
import { usePermissions } from "../components/permissions/usePermissions";
import { runGapMinimization } from "../lib/scheduleOptimizer";
import { toast } from "sonner";

const BARBERS_PER_GROUP = 5;

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("day");
  const [barberGroupIndex, setBarberGroupIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showQuickBooking, setShowQuickBooking] = useState(false);
  const [bookingPrefill, setBookingPrefill] = useState(null);
  const [contextMenu, setContextMenu] = useState({ booking: null, position: { x: 0, y: 0 } });
  const [slotMenu, setSlotMenu] = useState({ barber: null, time: null, date: null, position: { x: 0, y: 0 } });
  const [checkoutBooking, setCheckoutBooking] = useState(null);
  const [initialPinchDistance, setInitialPinchDistance] = useState(null);
  const [initialZoomLevel, setInitialZoomLevel] = useState(1);
  const [showAssistant, setShowAssistant] = useState(false);
  const [leaderboardCollapsed, setLeaderboardCollapsed] = useState(() => {
    const saved = localStorage.getItem("leaderboardCollapsed");
    return saved !== null ? saved === "true" : window.innerWidth < 768;
  });
  const toggleLeaderboard = (collapsed) => {
    setLeaderboardCollapsed(collapsed);
    localStorage.setItem("leaderboardCollapsed", String(collapsed));
  };
  const [isNarrowScreen, setIsNarrowScreen] = useState(() => window.innerWidth < 768);
  const [mobileCalView, setMobileCalView] = useState("mine");
  const isMobile = useIsMobile();
  const { currentBarber, user } = useAuth();
  const { hasPermission } = usePermissions();
  const isOwner = hasPermission('calendar.configuration', 'modify');

  useEffect(() => {
    const handler = () => setIsNarrowScreen(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const queryClient = useQueryClient();

  const { data: barbers = [], isLoading: barbersLoading } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => entities.Barber.list(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => entities.Service.list(),
  });

  const { data: shopSettingsArr = [] } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => entities.ShopSettings.list(),
  });
  const shopSettings = shopSettingsArr[0] || {};

  const dateRange = useMemo(() => {
    if (viewMode === "day") return [format(currentDate, "yyyy-MM-dd")];
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), "yyyy-MM-dd"));
  }, [currentDate, viewMode]);

  const { data: bookings = [], isLoading: bookingsLoading, isFetching: bookingsFetching } = useQuery({
    queryKey: ["bookings", dateRange[0], dateRange[dateRange.length - 1]],
    queryFn: async () => {
      const all = await entities.Booking.list("-date", 500);
      return all.filter(b => b.date >= dateRange[0] && b.date <= dateRange[dateRange.length - 1]);
    },
  });

  const { data: cashTransactions = [] } = useQuery({
    queryKey: ["cashTransactions"],
    queryFn: () => entities.CashTransaction.list("-date", 500),
  });

  const { data: approvedTimeOff = [] } = useQuery({
    queryKey: ["timeOffRequests", "approved"],
    queryFn: () => entities.TimeOffRequest.filter({ status: "approved" }),
  });

  const createBooking = useMutation({
    mutationFn: (data) => entities.Booking.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  const handleCreateBooking = async (data) => {
    await entities.Booking.create(data);
    if (shopSettings.schedule_optimizer_enabled !== false) {
      await runGapMinimization(data.barber_id, data.date).catch(console.error);
    }
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
    setShowBookingForm(false);
    setShowQuickBooking(false);
  };

  const handleCreateBookings = async (bookingsData) => {
    console.log("[handleCreateBookings] called with:", bookingsData);
    // bookingsData may be one or many — always treat as array
    const items = Array.isArray(bookingsData) ? bookingsData : [bookingsData];
    try {
      for (const item of items) {
        console.log("[handleCreateBookings] inserting booking:", item);
        await entities.Booking.create(item);
        console.log("[handleCreateBookings] insert succeeded for:", item.client_name, item.service_name);
      }
      if (shopSettings.schedule_optimizer_enabled !== false) {
        const seen = new Set();
        for (const item of items) {
          const key = `${item.barber_id}|${item.date}`;
          if (seen.has(key)) continue;
          seen.add(key);
          await runGapMinimization(item.barber_id, item.date).catch(console.error);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setShowBookingForm(false);
      setShowQuickBooking(false);
      console.log("[handleCreateBookings] done, calendar refreshed");
    } catch (err) {
      console.error("[handleCreateBookings] failed:", err);
      toast.error("Failed to create booking: " + (err.message || "Unknown error"));
    }
  };

  const updateBooking = useMutation({
    mutationFn: ({ id, data }) => entities.Booking.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });

  const handleBookingResize = (booking, newDuration, direction) => {
    const [hours, minutes] = booking.start_time.split(':').map(Number);
    let newStartTime = booking.start_time;
    
    if (direction === 'top') {
      const oldDuration = booking.duration || 30;
      const durationDiff = oldDuration - newDuration;
      const newStartMinutes = hours * 60 + minutes + durationDiff;
      newStartTime = `${String(Math.floor(newStartMinutes / 60)).padStart(2, '0')}:${String(newStartMinutes % 60).padStart(2, '0')}`;
    }
    
    const newEndMinutes = (direction === 'top' ? (hours * 60 + minutes + (booking.duration - newDuration)) : (hours * 60 + minutes)) + newDuration;
    const newEndTime = `${String(Math.floor(newEndMinutes / 60)).padStart(2, '0')}:${String(newEndMinutes % 60).padStart(2, '0')}`;
    
    updateBooking.mutate({
      id: booking.id,
      data: {
        start_time: newStartTime,
        end_time: newEndTime,
        duration: newDuration
      }
    });
  };

  // Group barbers for display — filter based on display setting
  const showWorkingOnly = localStorage.getItem("calendar_show_working_only") !== "false";
  const dayName = format(currentDate, "EEEE").toLowerCase(); // e.g. "monday"
  const activeBarbers = barbers.filter(b => {
    if (b.is_active === false) return false;
    if (!showWorkingOnly) return true;
    // If no hours configured at all, show the barber (assume always working)
    if (!b.hours || Object.keys(b.hours).length === 0) return true;
    const dayHours = b.hours?.[dayName];
    // Day not explicitly configured → assume working
    if (!dayHours) return true;
    if (dayHours.off === true || dayHours.closed === true) return false;
    return true;
  });
  const totalGroups = 1;
  // "My Schedule" shows only the logged-in barber's column on mobile.
  // Falls back to first barber if the logged-in user has no barber record (e.g. admin).
  const myBarber = activeBarbers.find(b => b.id === currentBarber?.id) ?? activeBarbers[0];
  const visibleBarbers = isNarrowScreen && mobileCalView === "mine" && myBarber
    ? [myBarber]
    : activeBarbers;

  const handleSlotClick = (e, barber, time, date) => {
    setSlotMenu({ 
      barber, 
      time, 
      date, 
      position: { x: Math.min(e.clientX, window.innerWidth - 200), y: Math.min(e.clientY, window.innerHeight - 180) } 
    });
  };

  const handleBookingContext = (e, booking) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ booking, position: { x: Math.min(e.clientX, window.innerWidth - 200), y: e.clientY } });
  };

  const deleteBooking = useMutation({
    mutationFn: (id) => entities.Booking.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });

  const handleContextAction = async (action, bookingId, extra) => {
    if (action === "checkout") {
      const booking = bookings.find(b => b.id === bookingId);
      setCheckoutBooking(booking);
      setContextMenu({ booking: null, position: { x: 0, y: 0 } });
      return;
    }
    if (action === "delete_block_one") {
      deleteBooking.mutate(bookingId);
      return;
    }
    if (action === "delete_block_all" && extra?.repeat_group_id) {
      const allBookings = await entities.Booking.list("-date", 1000);
      const groupBookings = allBookings.filter(b => b.repeat_group_id === extra.repeat_group_id);
      for (const b of groupBookings) {
        await entities.Booking.delete(b.id);
      }
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      return;
    }

    // Record no-show or late on the client account
    if (action === "no_show" || action === "late") {
      const booking = bookings.find(b => b.id === bookingId);
      if (booking?.client_id) {
        const clients = await entities.Client.filter({ id: booking.client_id });
        const client = clients[0];
        if (client) {
          const field = action === "no_show" ? "no_show_count" : "late_count";
          await entities.Client.update(client.id, {
            [field]: (client[field] || 0) + 1
          });
        }
      }
      if (action === "no_show") {
        updateBooking.mutate({ id: bookingId, data: { status: "no_show" } });
        return;
      }
      updateBooking.mutate({ id: bookingId, data: { status: "late" } });
      return;
    }

    if (action === "cancel") {
      const booking = bookings.find(b => b.id === bookingId);
      if (booking?.deposit_payment_intent_id) {
        await supabase.functions.invoke("stripe-refund-deposit", {
          body: { bookingId, shopId: booking.shop_id },
        });
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
        return;
      }
      const cancelData = { status: "cancelled" };
      if (extra?.cancel_reason) cancelData.cancel_reason = extra.cancel_reason;
      updateBooking.mutate({ id: bookingId, data: cancelData });
      return;
    }

    const statusMap = { confirm: "confirmed", checked_in: "checked_in", completed: "completed" };
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

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
    queryClient.invalidateQueries({ queryKey: ["barbers"] });
    queryClient.invalidateQueries({ queryKey: ["shopSettings"] });
  };

  const handleToggleLeaderboard = async (newValue) => {
    if (!shopSettings.id) return;
    await supabase.from('shop_settings').update({ leaderboard_visible: newValue }).eq('id', shopSettings.id);
    queryClient.invalidateQueries({ queryKey: ["shopSettings"] });
  };

  const leaderboardVisible = shopSettings.leaderboard_visible !== false;

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
      className={isMobile ? "flex flex-col h-full" : "flex h-full"}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
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
        onRefresh={handleRefresh}
        isRefreshing={bookingsFetching}
        mobileCalView={isNarrowScreen ? mobileCalView : undefined}
        setMobileCalView={setMobileCalView}
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
          onBookingResize={handleBookingResize}
          zoomLevel={zoomLevel}
          approvedTimeOff={approvedTimeOff}
        />
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="flex">
            {dateRange.map(dateStr => (
              <div key={dateStr} className="min-w-[300px] flex-1 border-r border-border dark:border-border">
                <div className="sticky top-0 bg-[#FAFAF8] dark:bg-background px-3 py-2 border-b border-border dark:border-border text-center">
                  <p className="text-xs font-semibold">{format(new Date(dateStr + "T12:00:00"), "EEE")}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(dateStr + "T12:00:00"), "MMM d")}</p>
                </div>
                <div className="p-2 space-y-1">
                  {bookings.filter(b => b.date === dateStr && b.status !== "cancelled").map(b => (
                    <div
                      key={b.id}
                      onClick={(e) => handleBookingContext(e, b)}
                      className="bg-card dark:bg-card rounded-lg border border-border dark:border-border p-2 cursor-pointer hover:border-[#8B9A7E]/30 transition-all"
                    >
                      <p className="text-[10px] font-semibold">{b.client_name}</p>
                      <p className="text-[9px] text-muted-foreground">{b.barber_name} • {b.start_time} - {b.end_time}</p>
                      <p className="text-[9px] text-[#8B9A7E]">{b.service_name}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <QuickBookingModal
        open={showQuickBooking}
        onClose={() => setShowQuickBooking(false)}
        onSave={(data) => handleCreateBookings(data)}
        barbers={activeBarbers}
        services={services}
        prefill={bookingPrefill}
        bookings={bookings}
      />

      <BookingFormModal
        open={showBookingForm}
        onClose={() => setShowBookingForm(false)}
        onSave={(data) => handleCreateBookings(data)}
        barbers={activeBarbers}
        services={services}
        prefill={bookingPrefill}
        bookings={bookings}
      />

      <BookingContextMenu
        booking={contextMenu.booking}
        position={contextMenu.position}
        onClose={() => setContextMenu({ booking: null, position: { x: 0, y: 0 } })}
        onAction={handleContextAction}
      />

      <BarberAssistant
        open={showAssistant}
        onClose={() => setShowAssistant(false)}
      />

      <CheckoutModal
        open={!!checkoutBooking}
        onClose={() => setCheckoutBooking(null)}
        booking={checkoutBooking}
        onComplete={() => queryClient.invalidateQueries({ queryKey: ["bookings"] })}
      />

      {/* Slot Action Menu */}
      {slotMenu.barber && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setSlotMenu({ barber: null, time: null, date: null, position: { x: 0, y: 0 } })} />
          <div
            className="fixed z-50 bg-card dark:bg-card rounded-lg shadow-xl border border-border dark:border-border p-2 min-w-[180px]"
            style={{ top: slotMenu.position.y, left: slotMenu.position.x }}
          >
            <div className="px-2 py-1 border-b border-border dark:border-border mb-1">
              <p className="text-xs font-semibold text-muted-foreground dark:text-gray-200">{slotMenu.barber.name}</p>
              <p className="text-[10px] text-muted-foreground">{slotMenu.time} • {format(new Date(slotMenu.date + "T12:00:00"), "MMM d")}</p>
            </div>
            <button
              onClick={() => {
                setBookingPrefill({ barber_id: slotMenu.barber.id, start_time: slotMenu.time, date: slotMenu.date });
                setShowQuickBooking(true);
                setSlotMenu({ barber: null, time: null, date: null, position: { x: 0, y: 0 } });
              }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-accent dark:hover:bg-muted rounded flex items-center gap-2"
            >
              <span>📅</span> Walk-in / Call-in
            </button>
            <button
              onClick={() => {
                setBookingPrefill({ barber_id: slotMenu.barber.id, start_time: slotMenu.time, date: slotMenu.date });
                setShowBookingForm(true);
                setSlotMenu({ barber: null, time: null, date: null, position: { x: 0, y: 0 } });
              }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-accent dark:hover:bg-muted rounded flex items-center gap-2"
            >
              <span>👤</span> Regular Appointment
            </button>
            <button
              onClick={() => {
                setBookingPrefill({
                  barber_id: slotMenu.barber.id,
                  start_time: slotMenu.time,
                  date: slotMenu.date,
                  client_name: "BLOCKED TIME",
                  service_name: "Blocked"
                });
                setShowBookingForm(true);
                setSlotMenu({ barber: null, time: null, date: null, position: { x: 0, y: 0 } });
              }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-accent dark:hover:bg-muted rounded flex items-center gap-2"
            >
              <span>🚫</span> Block Time
            </button>
          </div>
        </>
      )}

      {/* AI Assistant FAB */}
      <Button
        size="icon"
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-full shadow-lg bg-gradient-to-br from-[#8B9A7E] to-[#6B7A5E] hover:shadow-xl transition-all z-50"
        onClick={() => setShowAssistant(true)}
      >
        <Sparkles className="w-6 h-6 text-white" />
      </Button>
      </div>

      {/* Leaderboard Sidebar — hidden in mobile mode; hidden for non-owners when leaderboardVisible is false */}
      {!isMobile && (leaderboardVisible || isOwner) && (
        <div
          className="flex-shrink-0 border-l border-border dark:border-border bg-card dark:bg-card flex flex-col transition-all duration-300 overflow-hidden"
          style={{ width: leaderboardCollapsed ? "2.5rem" : "20rem" }}
        >
          {leaderboardCollapsed ? (
            <button
              onClick={() => toggleLeaderboard(false)}
              className="flex flex-col items-center pt-3 gap-3 h-full w-full hover:bg-accent dark:hover:bg-muted transition-colors cursor-pointer"
              title="Expand leaderboard"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              <span
                className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                Leaderboard
              </span>
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between px-3 py-2 border-b border-border dark:border-border flex-shrink-0">
                <span className="text-[10px] font-semibold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">Leaderboard</span>
                <button
                  onClick={() => toggleLeaderboard(true)}
                  className="p-1 rounded hover:bg-accent dark:hover:bg-muted text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-300 transition-colors"
                  title="Collapse leaderboard"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                <LeaderboardCard
                  bookings={bookings}
                  cashTransactions={cashTransactions}
                  barbers={barbers}
                  isOwner={isOwner}
                  leaderboardVisible={leaderboardVisible}
                  onToggleVisibility={handleToggleLeaderboard}
                  currentUserEmail={user?.email}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}