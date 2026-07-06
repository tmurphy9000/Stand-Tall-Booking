import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { format, addMinutes, parse } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Search, CheckCircle, Phone, ArrowLeft, ArrowRight,
  Clock, User, Loader2, AlertCircle, Tablet, Scissors, ExternalLink,
} from "lucide-react";

const todayStr = format(new Date(), "yyyy-MM-dd");
const todayDisplay = format(new Date(), "EEEE, MMMM d, yyyy");

const fmt12 = (hhmm) => {
  if (!hhmm) return "";
  try { return format(parse(hhmm, "HH:mm", new Date()), "h:mm a"); } catch { return hhmm; }
};

function normalizePhone(p) {
  const d = (p || "").replace(/\D/g, "");
  return d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
}

// ── Slot helpers ─────────────────────────────────────────────────────────────

function generateSlots(start, end, intervalMins) {
  const slots = [];
  const [eh, em] = end.split(":").map(Number);
  const endTot = eh * 60 + em;
  let [h, m] = start.split(":").map(Number);
  let cur = h * 60 + m;
  while (cur < endTot) {
    slots.push(`${String(Math.floor(cur / 60)).padStart(2, "0")}:${String(cur % 60).padStart(2, "0")}`);
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

function buildWalkInSlots(barbers, bookedSlots, approvedTimeOff, service, minNotice) {
  const now = new Date();
  const cutoffHHMM = format(addMinutes(now, minNotice), "HH:mm");
  const dayName = format(now, "EEEE").toLowerCase();
  const result = [];

  for (const barber of barbers) {
    // Skip barbers that don't offer this service (when available_services is configured)
    const available = barber.available_services;
    if (available && available.length > 0 && !available.includes(service.id)) continue;

    const onTimeOff = approvedTimeOff.some(
      r => r.barber_id === barber.id && todayStr >= r.start_date && todayStr <= r.end_date
    );
    if (onTimeOff) continue;

    const dh = barber.hours?.[dayName];
    if (!dh || dh.off || dh.closed) continue;

    const serviceDuration = barber.service_durations?.[service.id] ?? service.duration ?? 30;
    const closeStr = dh.end || "18:00";
    const [eh, em] = closeStr.split(":").map(Number);
    const closeMins = eh * 60 + em;

    const barberBooked = bookedSlots.filter(b => b.barber_id === barber.id);
    const allSlots = generateSlots(dh.start || "09:00", closeStr, 15);

    for (const time of allSlots) {
      if (time <= cutoffHHMM) continue;
      const [sh, sm] = time.split(":").map(Number);
      if (sh * 60 + sm + serviceDuration > closeMins) continue;
      if (isSlotTaken(time, serviceDuration, barberBooked)) continue;

      const endTime = format(addMinutes(parse(time, "HH:mm", new Date()), serviceDuration), "HH:mm");
      result.push({ time, endTime, barberId: barber.id, barberName: barber.name, serviceDuration });
    }
  }

  result.sort((a, b) => a.time.localeCompare(b.time) || a.barberName.localeCompare(b.barberName));
  return result;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AppointmentRow({ booking, onSelect }) {
  const alreadyCheckedIn = booking.status === "checked_in";
  return (
    <button
      onClick={alreadyCheckedIn ? undefined : onSelect}
      disabled={alreadyCheckedIn}
      className={cn(
        "w-full text-left bg-white rounded-2xl border px-5 py-5 flex items-center justify-between transition-all",
        alreadyCheckedIn
          ? "border-green-200 bg-green-50 opacity-70 cursor-default"
          : "border-gray-100 hover:border-[#8B9A7E]/50 hover:shadow-sm active:scale-[0.99] cursor-pointer"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xl font-semibold text-gray-900 truncate">{booking.client_name}</p>
        <p className="text-base text-gray-500 mt-1 truncate">
          {fmt12(booking.start_time)} · {booking.barber_name} · {booking.service_name}
        </p>
      </div>
      {alreadyCheckedIn ? (
        <div className="flex items-center gap-1.5 text-green-600 flex-shrink-0 ml-3">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium whitespace-nowrap">Checked in</span>
        </div>
      ) : (
        <div className="w-11 h-11 rounded-full bg-[#8B9A7E]/10 flex items-center justify-center flex-shrink-0 ml-3">
          <ArrowRight className="w-5 h-5 text-[#8B9A7E]" />
        </div>
      )}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function KioskPage() {
  const { kioskToken } = useParams();

  // screen: loading | error | landing | browse | phone | confirm | success
  //       | wi_form | wi_service | wi_slots | wi_done
  const [screen, setScreen] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [shopData, setShopData] = useState(null);
  const [shopSlug, setShopSlug] = useState("");
  const [bookings, setBookings] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneResults, setPhoneResults] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [countdown, setCountdown] = useState(12);

  // Walk-in config
  const [walkInEnabled, setWalkInEnabled] = useState(false);
  const [minNotice, setMinNotice] = useState(0);

  // Walk-in form
  const [wiFirstName, setWiFirstName] = useState("");
  const [wiLastName, setWiLastName] = useState("");
  const [wiPhone, setWiPhone] = useState("");
  const [wiError, setWiError] = useState("");

  // Walk-in service selection
  const [wiServices, setWiServices] = useState([]);
  const [wiLoadingServices, setWiLoadingServices] = useState(false);
  const [wiService, setWiService] = useState(null);

  // Walk-in slots
  const [wiLoadingSlots, setWiLoadingSlots] = useState(false);
  const [wiSlots, setWiSlots] = useState([]);

  // Walk-in booking
  const [wiBookingSlot, setWiBookingSlot] = useState(null);
  const [wiBookError, setWiBookError] = useState("");
  const [wiBookedAppt, setWiBookedAppt] = useState(null);
  const [wiCountdown, setWiCountdown] = useState(12);

  // ── Bootstrap ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!kioskToken) {
      setErrorMsg("No kiosk token in the URL. Please check the link.");
      setScreen("error");
      return;
    }

    (async () => {
      const { data: settingsRow, error: settingsErr } = await supabase
        .from("shop_settings")
        .select("shop_id, min_booking_notice_minutes, walk_in_enabled")
        .eq("kiosk_token", kioskToken)
        .maybeSingle();

      if (settingsErr || !settingsRow?.shop_id) {
        setErrorMsg("Invalid or expired kiosk link. Please contact your shop for a new link.");
        setScreen("error");
        return;
      }

      const shopId = settingsRow.shop_id;
      setMinNotice(settingsRow.min_booking_notice_minutes ?? 0);
      setWalkInEnabled(settingsRow.walk_in_enabled ?? false);

      const [shopRes, bookingsRes, barbersRes] = await Promise.all([
        supabase.from("shops").select("id, name, url_slug").eq("id", shopId).single(),
        supabase
          .from("bookings")
          .select("id, client_name, client_phone, barber_id, barber_name, service_name, start_time, end_time, duration, status, checked_in_at")
          .eq("shop_id", shopId)
          .eq("date", todayStr)
          .or("status.eq.scheduled,status.eq.confirmed,status.eq.checked_in,status.eq.late")
          .not("client_name", "in", '("Walk-in","Call-in")')
          .order("start_time"),
        supabase
          .from("barbers")
          .select("id, name, email, permission_level, hours, service_durations, available_services")
          .eq("shop_id", shopId)
          .eq("is_active", true),
      ]);

      if (shopRes.error || !shopRes.data) {
        setErrorMsg("Could not load shop information. Please try again.");
        setScreen("error");
        return;
      }

      setShopData(shopRes.data);
      setShopSlug(shopRes.data.url_slug ?? "");
      setBookings(bookingsRes.data ?? []);
      setBarbers(barbersRes.data ?? []);
      setScreen("landing");
    })();
  }, [kioskToken]);

  // ── Auto-return countdowns ────────────────────────────────────────────

  useEffect(() => {
    if (screen !== "success") return;
    setCountdown(12);
    const id = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(id); resetToHome(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (screen !== "wi_done") return;
    setWiCountdown(12);
    const id = setInterval(() => {
      setWiCountdown(prev => {
        if (prev <= 1) { clearInterval(id); resetToHome(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetToHome = useCallback(() => {
    setScreen("landing");
    setSelectedBooking(null);
    setSearchTerm("");
    setPhoneInput("");
    setPhoneResults(null);
    setWiFirstName("");
    setWiLastName("");
    setWiPhone("");
    setWiError("");
    setWiServices([]);
    setWiService(null);
    setWiSlots([]);
    setWiBookingSlot(null);
    setWiBookError("");
    setWiBookedAppt(null);
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────

  const filteredBookings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return bookings;
    return bookings.filter(b => (b.client_name || "").toLowerCase().includes(term));
  }, [bookings, searchTerm]);

  const waitInfo = useMemo(() => {
    if (!selectedBooking) return null;
    const ahead = bookings.filter(b =>
      b.barber_id === selectedBooking.barber_id &&
      b.id !== selectedBooking.id &&
      b.start_time <= selectedBooking.start_time &&
      ["scheduled", "confirmed", "checked_in", "late"].includes(b.status)
    );
    if (ahead.length === 0) return { isNext: true };
    const totalMin = ahead.reduce((sum, b) => sum + (b.duration || 30), 0);
    return { isNext: false, minutes: totalMin, count: ahead.length };
  }, [selectedBooking, bookings]);

  // ── Check-in actions ─────────────────────────────────────────────────

  const handlePhoneSearch = useCallback(() => {
    const normalized = normalizePhone(phoneInput);
    if (normalized.length < 4) return;
    setPhoneResults(
      bookings.filter(b => normalizePhone(b.client_phone).includes(normalized))
    );
  }, [bookings, phoneInput]);

  const handleCheckIn = useCallback(async () => {
    if (!selectedBooking || checkingIn || !shopData) return;
    setCheckingIn(true);

    const now = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from("bookings")
      .update({ status: "checked_in", checked_in_at: now })
      .eq("id", selectedBooking.id);

    if (updateErr) {
      setCheckingIn(false);
      setErrorMsg("Check-in failed. Please ask a staff member for help.");
      setScreen("error");
      return;
    }

    setBookings(prev =>
      prev.map(b =>
        b.id === selectedBooking.id ? { ...b, status: "checked_in", checked_in_at: now } : b
      )
    );

    const notifyEmails = new Set();
    const barber = barbers.find(b => b.id === selectedBooking.barber_id);
    if (barber?.email) notifyEmails.add(barber.email);
    barbers
      .filter(b => b.permission_level === "owner" || b.permission_level === "manager")
      .forEach(b => b.email && notifyEmails.add(b.email));

    const notifications = Array.from(notifyEmails).map(email => ({
      title: "Client Checked In",
      message: `${selectedBooking.client_name} checked in for their ${fmt12(selectedBooking.start_time)} appointment with ${barber?.name || selectedBooking.barber_name}.`,
      recipient_email: email,
      recipient_type: "staff",
      type: "client_check_in",
      shop_id: shopData.id,
      booking_id: selectedBooking.id,
      is_read: false,
      created_date: now,
      date: todayStr,
    }));

    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications);
    }

    setCheckingIn(false);
    setScreen("success");
  }, [selectedBooking, checkingIn, barbers, shopData]);

  // ── Walk-in actions ───────────────────────────────────────────────────

  // Step 1 → Step 2: validate form, fetch services, navigate to service picker
  const handleWalkInFormSubmit = useCallback(async () => {
    const first = wiFirstName.trim();
    const last = wiLastName.trim();
    const phone = normalizePhone(wiPhone);

    if (!first) { setWiError("Please enter your first name."); return; }
    if (!last) { setWiError("Please enter your last name."); return; }
    if (phone.length < 10) { setWiError("Please enter a valid 10-digit phone number."); return; }

    setWiError("");
    setWiService(null);
    setWiSlots([]);
    setWiBookError("");
    setWiBookingSlot(null);
    setWiLoadingServices(true);
    setScreen("wi_service");

    try {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, duration, price")
        .eq("shop_id", shopData.id)
        .order("created_at");
      if (error) console.error("[kiosk] walk-in services query error:", error);
      setWiServices(data ?? []);
    } catch (e) {
      console.error("[kiosk] walk-in services load error:", e);
      setWiServices([]);
    } finally {
      setWiLoadingServices(false);
    }
  }, [wiFirstName, wiLastName, wiPhone, shopData]);

  // Step 2 → Step 3: select service, build slots
  const handleWalkInSelectService = useCallback(async (service) => {
    setWiService(service);
    setWiSlots([]);
    setWiBookError("");
    setWiBookingSlot(null);
    setWiLoadingSlots(true);
    setScreen("wi_slots");

    try {
      const barberIds = barbers.map(b => b.id);
      const [bookedSlotsRes, timeOffRes] = await Promise.all([
        supabase.rpc("get_booked_slots", { p_shop_id: shopData.id, p_date: todayStr }),
        barberIds.length > 0
          ? supabase.from("time_off_requests").select("barber_id, start_date, end_date").eq("status", "approved").in("barber_id", barberIds)
          : Promise.resolve({ data: [] }),
      ]);

      const bookedSlots = bookedSlotsRes.data ?? [];
      const approvedTimeOff = timeOffRes.data ?? [];
      const slots = buildWalkInSlots(barbers, bookedSlots, approvedTimeOff, service, minNotice);
      setWiSlots(slots);
    } catch (e) {
      console.error("[kiosk] walk-in slot load error:", e);
      setWiSlots([]);
    } finally {
      setWiLoadingSlots(false);
    }
  }, [barbers, shopData, minNotice]);

  // Step 3: confirm slot → create booking
  const handleWalkInBook = useCallback(async (slot) => {
    if (wiBookingSlot) return;
    setWiBookingSlot(slot);
    setWiBookError("");

    const first = wiFirstName.trim();
    const last = wiLastName.trim();
    const phone = normalizePhone(wiPhone);
    const clientName = `${first} ${last}`;

    try {
      let clientId = null;
      try {
        const { data: clientData } = await supabase.rpc("upsert_verified_client", {
          p_shop_id:    shopData.id,
          p_phone:      phone,
          p_first_name: first,
          p_last_name:  last,
          p_email:      null,
          p_sms_opt_in: true,
        });
        clientId = clientData?.[0]?.id ?? null;
      } catch { /* non-fatal */ }

      const { error: insertErr } = await supabase.from("bookings").insert({
        shop_id:      shopData.id,
        barber_id:    slot.barberId,
        barber_name:  slot.barberName,
        service_id:   wiService.id,
        service_name: wiService.name,
        client_id:    clientId,
        client_name:  clientName,
        client_phone: phone,
        date:         todayStr,
        start_time:   slot.time,
        end_time:     slot.endTime,
        duration:     slot.serviceDuration,
        price:        wiService.price ?? 0,
        final_price:  wiService.price ?? 0,
        status:       "scheduled",
        source:       "walk_in",
        visit_type:   "in_person",
      });

      if (insertErr) {
        setWiBookError("That slot is no longer available. Please choose another time.");
        setWiBookingSlot(null);
        return;
      }

      // Fire-and-forget SMS confirmation
      supabase.functions.invoke("sendBookingConfirmation", {
        body: {
          client_name:  clientName,
          client_phone: phone,
          sms_opt_in:   true,
          barber_name:  slot.barberName,
          service_name: wiService.name,
          date:         todayStr,
          start_time:   slot.time,
          end_time:     slot.endTime,
          shop_name:    shopData?.name,
          shop_slug:    shopSlug || undefined,
        },
      }).catch(() => {});

      setWiBookedAppt({ clientName, time: slot.time, barberName: slot.barberName });
      setScreen("wi_done");
    } catch (e) {
      console.error("[kiosk] walk-in book error:", e);
      setWiBookError("Something went wrong. Please try again.");
      setWiBookingSlot(null);
    }
  }, [wiBookingSlot, wiFirstName, wiLastName, wiPhone, shopData, shopSlug, wiService]);

  // ── Shared header ─────────────────────────────────────────────────────

  const KioskHeader = ({ onBack } = {}) => (
    <div className="bg-white border-b px-6 py-4">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-3 -ml-3 rounded-xl text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-base">Back</span>
          </button>
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{shopData?.name}</h1>
            <p className="text-sm text-gray-400">{todayDisplay}</p>
          </div>
        )}
        {onBack ? (
          <p className="text-sm font-semibold text-gray-700">{shopData?.name}</p>
        ) : (
          <div className="bg-[#8B9A7E]/10 rounded-full p-2.5">
            <Tablet className="w-5 h-5 text-[#8B9A7E]" />
          </div>
        )}
        {onBack && <div className="w-16" />}
      </div>
    </div>
  );

  // ── Screens ───────────────────────────────────────────────────────────

  if (screen === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
        <Loader2 className="w-10 h-10 animate-spin text-[#8B9A7E]" />
      </div>
    );
  }

  if (screen === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] p-8">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">Something went wrong</h1>
          <p className="text-gray-500 text-base mb-8">{errorMsg}</p>
          <button
            onClick={resetToHome}
            className="px-8 py-4 rounded-2xl border border-[#8B9A7E]/40 text-base text-[#8B9A7E] font-semibold"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Check-in success ────────────────────────────────────────────────

  if (screen === "success") {
    const barber = barbers.find(b => b.id === selectedBooking?.barber_id);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#8B9A7E] text-white p-8 text-center">
        <CheckCircle className="w-24 h-24 mb-6" strokeWidth={1.5} />
        <h1 className="text-4xl font-bold mb-2">You're checked in!</h1>
        <p className="text-2xl font-semibold opacity-90 mb-1">{selectedBooking?.client_name}</p>
        <p className="text-lg opacity-75 mb-8">
          {barber?.name || selectedBooking?.barber_name} will be with you shortly.
        </p>
        {waitInfo && (
          <div className="bg-white/20 rounded-2xl px-8 py-5 mb-8">
            {waitInfo.isNext ? (
              <p className="text-xl">You&apos;re next — please have a seat.</p>
            ) : (
              <p className="text-xl">
                ~{waitInfo.minutes} min estimated wait
                {waitInfo.count > 0 && ` (${waitInfo.count} client${waitInfo.count > 1 ? "s" : ""} ahead)`}
              </p>
            )}
          </div>
        )}
        <p className="text-base opacity-60 mb-6">Please have a seat.</p>
        <button onClick={resetToHome} className="mt-2 px-8 py-4 rounded-2xl bg-white/15 hover:bg-white/25 text-base opacity-80 hover:opacity-100 transition-all">
          Done — returning in {countdown}s
        </button>
      </div>
    );
  }

  // ── Check-in confirm ────────────────────────────────────────────────

  if (screen === "confirm" && selectedBooking) {
    const barber = barbers.find(b => b.id === selectedBooking.barber_id);
    return (
      <div className="min-h-screen flex flex-col bg-[#FAFAF8]">
        <KioskHeader onBack={resetToHome} />

        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="w-20 h-20 rounded-full bg-[#8B9A7E]/10 flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-[#8B9A7E]" />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 text-center mb-1">
              Hi, {selectedBooking.client_name?.split(" ")[0]}!
            </h1>
            <p className="text-gray-500 text-base text-center mb-8">Is this your appointment?</p>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 space-y-4">
              <div className="flex items-center gap-3">
                <Scissors className="w-5 h-5 text-[#8B9A7E] flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-400">Service</p>
                  <p className="text-lg font-semibold text-gray-800">{selectedBooking.service_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#8B9A7E] flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-400">Time</p>
                  <p className="text-lg font-semibold text-gray-800">{fmt12(selectedBooking.start_time)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-[#8B9A7E] flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-400">Barber</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {barber?.name || selectedBooking.barber_name}
                  </p>
                </div>
              </div>
              {waitInfo && (
                <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
                  <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-400">Estimated Wait</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {waitInfo.isNext ? "You're next!" : `~${waitInfo.minutes} min`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="w-full bg-[#8B9A7E] hover:bg-[#6B7A5E] disabled:opacity-60 text-white rounded-2xl py-5 text-lg font-semibold flex items-center justify-center gap-3 transition-colors"
            >
              {checkingIn
                ? <Loader2 className="w-6 h-6 animate-spin" />
                : <CheckCircle className="w-6 h-6" />}
              {checkingIn ? "Checking in…" : "Confirm Check-In"}
            </button>

            <button
              onClick={resetToHome}
              className="w-full mt-3 text-base text-gray-400 hover:text-gray-600 py-4 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors"
            >
              That's not me — go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Walk-in done ────────────────────────────────────────────────────

  if (screen === "wi_done" && wiBookedAppt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#8B9A7E] text-white p-8 text-center">
        <CheckCircle className="w-24 h-24 mb-6" strokeWidth={1.5} />
        <h1 className="text-4xl font-bold mb-2">You're booked!</h1>
        <p className="text-2xl font-semibold opacity-90 mb-1">{wiBookedAppt.clientName}</p>
        <div className="bg-white/20 rounded-2xl px-8 py-5 mb-6">
          <p className="text-xl font-semibold">{fmt12(wiBookedAppt.time)} with {wiBookedAppt.barberName}</p>
          <p className="text-base opacity-80 mt-1">A confirmation text is on its way.</p>
        </div>
        <p className="text-base opacity-60 mb-6">Please have a seat — we'll call your name shortly.</p>
        <button onClick={resetToHome} className="mt-2 px-8 py-4 rounded-2xl bg-white/15 hover:bg-white/25 text-base opacity-80 hover:opacity-100 transition-all">
          Done — returning in {wiCountdown}s
        </button>
      </div>
    );
  }

  // ── Walk-in slots ───────────────────────────────────────────────────

  if (screen === "wi_slots") {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAFAF8]">
        <KioskHeader onBack={() => setScreen("wi_service")} />

        <div className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Available Times Today</h2>
              {wiService && (
                <p className="text-gray-500 text-base mt-1">{wiService.name} — select a time below</p>
              )}
            </div>

            {wiBookError && (
              <div className="mb-4 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm text-center">
                {wiBookError}
              </div>
            )}

            {wiLoadingSlots ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-10 h-10 animate-spin text-[#8B9A7E]" />
              </div>
            ) : wiSlots.length === 0 ? (
              <div className="text-center py-16 space-y-6">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-gray-300" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-gray-800 mb-2">No available slots today</p>
                  <p className="text-gray-400 text-base">All barbers are fully booked for the rest of the day.</p>
                </div>
                {shopSlug && (
                  <a
                    href={`https://standtallbooking.com/book/${shopSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-[#8B9A7E] text-white text-base font-semibold hover:bg-[#6B7A5E] transition-colors"
                  >
                    Book a future appointment
                    <ExternalLink className="w-5 h-5" />
                  </a>
                )}
                <div>
                  <button onClick={resetToHome} className="text-base text-gray-400 hover:text-gray-600 py-3">
                    Return to home
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {wiSlots.map((slot, i) => {
                  const isBooking = wiBookingSlot?.time === slot.time && wiBookingSlot?.barberId === slot.barberId;
                  return (
                    <button
                      key={i}
                      onClick={() => handleWalkInBook(slot)}
                      disabled={!!wiBookingSlot}
                      className={cn(
                        "bg-white rounded-2xl border px-4 py-5 text-left transition-all",
                        wiBookingSlot
                          ? "opacity-50 cursor-not-allowed border-gray-100"
                          : "border-gray-100 hover:border-[#8B9A7E]/50 hover:shadow-sm active:scale-[0.98] cursor-pointer"
                      )}
                    >
                      {isBooking ? (
                        <div className="flex items-center justify-center py-1">
                          <Loader2 className="w-5 h-5 animate-spin text-[#8B9A7E]" />
                        </div>
                      ) : (
                        <>
                          <p className="text-xl font-bold text-gray-900">{fmt12(slot.time)}</p>
                          <p className="text-base text-[#8B9A7E] font-medium mt-0.5">{slot.barberName}</p>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Walk-in service picker ──────────────────────────────────────────

  if (screen === "wi_service") {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAFAF8]">
        <KioskHeader onBack={() => setScreen("wi_form")} />

        <div className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Choose a Service</h2>
              <p className="text-gray-500 text-base mt-1">Select what you'd like done today.</p>
            </div>

            {wiLoadingServices ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-10 h-10 animate-spin text-[#8B9A7E]" />
              </div>
            ) : wiServices.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-xl text-gray-400">No services available.</p>
                <p className="text-gray-400 mt-1">Please see a staff member.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {wiServices.map(service => (
                  <button
                    key={service.id}
                    onClick={() => handleWalkInSelectService(service)}
                    className="w-full bg-white rounded-2xl border border-gray-100 px-6 py-5 flex items-center justify-between text-left hover:border-[#8B9A7E]/50 hover:shadow-sm active:scale-[0.99] transition-all"
                  >
                    <div>
                      <p className="text-xl font-semibold text-gray-900">{service.name}</p>
                      <p className="text-base text-gray-400 mt-0.5">{service.duration} min</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <p className="text-xl font-semibold text-gray-900">${service.price ?? 0}</p>
                      <ArrowRight className="w-5 h-5 text-[#8B9A7E]" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Walk-in form (Step 1) ───────────────────────────────────────────

  if (screen === "wi_form") {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAFAF8]">
        <KioskHeader onBack={resetToHome} />

        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-md space-y-5">
            <div className="text-center mb-2">
              <div className="w-16 h-16 rounded-full bg-[#8B9A7E]/10 flex items-center justify-center mx-auto mb-4">
                <Scissors className="w-8 h-8 text-[#8B9A7E]" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Walk In</h1>
              <p className="text-gray-500 text-base mt-1">Enter your info to get started.</p>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                placeholder="First name"
                value={wiFirstName}
                onChange={e => setWiFirstName(e.target.value)}
                className="flex-1 px-4 py-4 text-base rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#8B9A7E]/40 focus:border-[#8B9A7E]"
              />
              <input
                type="text"
                placeholder="Last name"
                value={wiLastName}
                onChange={e => setWiLastName(e.target.value)}
                className="flex-1 px-4 py-4 text-base rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#8B9A7E]/40 focus:border-[#8B9A7E]"
              />
            </div>

            <input
              type="tel"
              placeholder="Phone number"
              value={wiPhone}
              onChange={e => setWiPhone(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleWalkInFormSubmit()}
              className="w-full px-4 py-4 text-base rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#8B9A7E]/40 focus:border-[#8B9A7E]"
            />

            {wiError && (
              <p className="text-red-500 text-sm text-center">{wiError}</p>
            )}

            <button
              onClick={handleWalkInFormSubmit}
              className="w-full bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white rounded-2xl py-5 text-lg font-semibold transition-colors"
            >
              Next — Choose a Service
            </button>

            <button
              onClick={resetToHome}
              className="w-full text-base text-gray-400 hover:text-gray-600 py-4 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors"
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Landing ─────────────────────────────────────────────────────────

  if (screen === "landing") {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAFAF8]">
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{shopData?.name}</h1>
              <p className="text-sm text-gray-400">{todayDisplay}</p>
            </div>
            <div className="bg-[#8B9A7E]/10 rounded-full p-2.5">
              <Tablet className="w-5 h-5 text-[#8B9A7E]" />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-5">
          <div className="text-center mb-2">
            <h2 className="text-3xl font-bold text-gray-900">Welcome!</h2>
            <p className="text-gray-500 text-base mt-2">How can we help you today?</p>
          </div>

          <div className={cn("w-full max-w-md space-y-4", !walkInEnabled && "flex flex-col items-center")}>
            <button
              onClick={() => setScreen("browse")}
              className={cn(
                "bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white rounded-2xl px-8 py-7 flex items-center gap-5 transition-colors active:scale-[0.99]",
                walkInEnabled ? "w-full" : "w-full max-w-sm"
              )}
            >
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold">Check In</p>
                <p className="text-base opacity-80 mt-0.5">I have an existing appointment</p>
              </div>
            </button>

            {walkInEnabled && (
              <button
                onClick={() => setScreen("wi_form")}
                className="w-full bg-white border-2 border-[#8B9A7E] text-[#8B9A7E] hover:bg-[#8B9A7E]/5 rounded-2xl px-8 py-7 flex items-center gap-5 transition-colors active:scale-[0.99]"
              >
                <div className="w-14 h-14 rounded-full bg-[#8B9A7E]/10 flex items-center justify-center flex-shrink-0">
                  <Scissors className="w-7 h-7" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold">Walk In</p>
                  <p className="text-base opacity-70 mt-0.5">Book a spot right now</p>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Check-in browse / phone ──────────────────────────────────────────

  const isPhoneScreen = screen === "phone";

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8]">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button
            onClick={resetToHome}
            className="flex items-center gap-2 px-3 py-3 -ml-3 rounded-xl text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-base">Back</span>
          </button>
          <p className="text-sm font-semibold text-gray-700">{shopData?.name}</p>
          <div className="w-16" />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

          <div className="text-center pt-2">
            <h2 className="text-3xl font-bold text-gray-900">Check In</h2>
            <p className="text-gray-500 text-base mt-2">
              {isPhoneScreen
                ? "Enter your phone number to find your appointment."
                : "Find your name below to check in for your appointment."}
            </p>
          </div>

          {isPhoneScreen ? (
            <div className="space-y-4">
              <button
                onClick={() => { setScreen("browse"); setPhoneInput(""); setPhoneResults(null); }}
                className="flex items-center gap-2 py-3 text-base text-[#8B9A7E] font-medium"
              >
                <ArrowLeft className="w-5 h-5" /> Back to name list
              </button>

              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="Your phone number"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handlePhoneSearch()}
                  autoFocus
                  className="flex-1 px-4 py-4 text-base rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#8B9A7E]/40 focus:border-[#8B9A7E]"
                />
                <button
                  onClick={handlePhoneSearch}
                  className="px-6 py-4 bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white rounded-2xl text-base font-semibold transition-colors"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>

              {phoneResults !== null && (
                <div className="space-y-3">
                  {phoneResults.length === 0 ? (
                    <p className="text-base text-gray-400 text-center py-8">
                      No appointments found for that number.
                    </p>
                  ) : (
                    phoneResults.map(booking => (
                      <AppointmentRow
                        key={booking.id}
                        booking={booking}
                        onSelect={() => { setSelectedBooking(booking); setScreen("confirm"); }}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search your name…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 text-base rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#8B9A7E]/40 focus:border-[#8B9A7E]"
                />
              </div>

              <div className="space-y-3">
                {filteredBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400 text-base">
                      {searchTerm
                        ? `No appointments found for "${searchTerm}"`
                        : "No appointments scheduled for today."}
                    </p>
                  </div>
                ) : (
                  filteredBookings.map(booking => (
                    <AppointmentRow
                      key={booking.id}
                      booking={booking}
                      onSelect={() => { setSelectedBooking(booking); setScreen("confirm"); }}
                    />
                  ))
                )}
              </div>

              <div className="border-t border-gray-100 pt-6 text-center">
                <p className="text-base text-gray-500 mb-4">Can't find your name?</p>
                <button
                  onClick={() => setScreen("phone")}
                  className="inline-flex items-center gap-3 px-7 py-4 rounded-2xl bg-white border border-[#8B9A7E]/30 text-base text-[#8B9A7E] font-semibold hover:border-[#8B9A7E] transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  Search by phone number
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
