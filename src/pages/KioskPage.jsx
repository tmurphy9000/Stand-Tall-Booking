import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Search, CheckCircle, Phone, ArrowLeft, ArrowRight,
  Clock, User, Loader2, AlertCircle, Tablet, Scissors,
} from "lucide-react";

const todayStr = format(new Date(), "yyyy-MM-dd");
const todayDisplay = format(new Date(), "EEEE, MMMM d, yyyy");

function normalizePhone(p) {
  return (p || "").replace(/\D/g, "");
}

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
          {booking.start_time} · {booking.barber_name} · {booking.service_name}
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

export default function KioskPage() {
  const { kioskToken } = useParams();

  // screen: 'loading' | 'error' | 'browse' | 'phone' | 'confirm' | 'success'
  const [screen, setScreen] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [shopData, setShopData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneResults, setPhoneResults] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [countdown, setCountdown] = useState(12);

  // ── Bootstrap ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!kioskToken) {
      setErrorMsg("No kiosk token in the URL. Please check the link.");
      setScreen("error");
      return;
    }

    (async () => {
      // Resolve shop_id from kiosk_token
      const { data: settingsRow, error: settingsErr } = await supabase
        .from("shop_settings")
        .select("shop_id")
        .eq("kiosk_token", kioskToken)
        .maybeSingle();

      if (settingsErr || !settingsRow?.shop_id) {
        setErrorMsg("Invalid or expired kiosk link. Please contact your shop for a new link.");
        setScreen("error");
        return;
      }

      const shopId = settingsRow.shop_id;

      // Fetch shop, today's bookings, and active barbers in parallel
      const [shopRes, bookingsRes, barbersRes] = await Promise.all([
        supabase.from("shops").select("id, name").eq("id", shopId).single(),
        supabase
          .from("bookings")
          .select("id, client_name, client_phone, barber_id, barber_name, service_name, start_time, end_time, duration, status, checked_in_at")
          .eq("shop_id", shopId)
          .eq("date", todayStr)
          .or("status.eq.scheduled,status.eq.confirmed,status.eq.checked_in,status.eq.late")
          .order("start_time"),
        supabase
          .from("barbers")
          .select("id, name, email, permission_level")
          .eq("shop_id", shopId)
          .eq("is_active", true),
      ]);

      if (shopRes.error || !shopRes.data) {
        setErrorMsg("Could not load shop information. Please try again.");
        setScreen("error");
        return;
      }

      setShopData(shopRes.data);
      setBookings(bookingsRes.data ?? []);
      setBarbers(barbersRes.data ?? []);
      setScreen("browse");
    })();
  }, [kioskToken]);

  // ── Auto-return countdown on success ──────────────────────────────────

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

  const resetToHome = useCallback(() => {
    setScreen("browse");
    setSelectedBooking(null);
    setSearchTerm("");
    setPhoneInput("");
    setPhoneResults(null);
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

  // ── Actions ───────────────────────────────────────────────────────────

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

    // Reflect the new status locally so the list updates instantly
    setBookings(prev =>
      prev.map(b =>
        b.id === selectedBooking.id ? { ...b, status: "checked_in", checked_in_at: now } : b
      )
    );

    // Notify the client's barber + every owner/manager
    const notifyEmails = new Set();
    const barber = barbers.find(b => b.id === selectedBooking.barber_id);
    if (barber?.email) notifyEmails.add(barber.email);
    barbers
      .filter(b => b.permission_level === "owner" || b.permission_level === "manager")
      .forEach(b => b.email && notifyEmails.add(b.email));

    const notifications = Array.from(notifyEmails).map(email => ({
      title: "Client Checked In",
      message: `${selectedBooking.client_name} checked in for their ${selectedBooking.start_time} appointment with ${barber?.name || selectedBooking.barber_name}.`,
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

  if (screen === "confirm" && selectedBooking) {
    const barber = barbers.find(b => b.id === selectedBooking.barber_id);
    return (
      <div className="min-h-screen flex flex-col bg-[#FAFAF8]">
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
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
                  <p className="text-lg font-semibold text-gray-800">{selectedBooking.start_time}</p>
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

  // ── Browse / Phone search screen ─────────────────────────────────────

  const isPhoneScreen = screen === "phone";

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8]">
      {/* Header */}
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

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

          {/* Welcome headline */}
          <div className="text-center pt-2">
            <h2 className="text-3xl font-bold text-gray-900">Welcome!</h2>
            <p className="text-gray-500 text-base mt-2">
              {isPhoneScreen
                ? "Enter your phone number to find your appointment."
                : "Find your name below to check in for your appointment."}
            </p>
          </div>

          {isPhoneScreen ? (
            /* ── Phone search ────────────────────────────────────────────── */
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
            /* ── Name browse ─────────────────────────────────────────────── */
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
