import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabaseClient";
import { loadClientSession, saveClientSession, clearClientSession, refreshClientSession } from "@/lib/clientSession";
import { format, addDays, addMinutes, parse } from "date-fns";
import {
  ArrowLeft, Loader2, CheckCircle2, X, AlertTriangle,
  Calendar, Scissors, User, Phone, RotateCcw, Ban, ShieldCheck,
} from "lucide-react";

const LOGO_URL =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6993eba91209ee0a1089f355/fd9cfe023_6f5fd5cc-8fc9-4041-9d87-c24e77a3bc58.png";

const DISCLAIMER_KEY = "stb_portal_disclaimer_seen";

// Capitalize first letter, lowercase the rest — handles "sarah"→"Sarah", "TANNER"→"Tanner"
function cap(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function fmtDate(d) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function fmtTime(t) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function maskPhone(phone) {
  const d = (phone || "").replace(/\D/g, "");
  return d.length >= 4 ? `(xxx) xxx-${d.slice(-4)}` : phone;
}

async function getBookedSlots(shopId, dateStr) {
  const { data, error } = await supabase.rpc("get_booked_slots", { p_shop_id: shopId, p_date: dateStr });
  if (error) throw error;
  return data ?? [];
}

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

// ── Sub-components ────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0f0f0f]">
      <Loader2 className="w-8 h-8 text-[#8B9A7E] animate-spin" />
    </div>
  );
}

function Modal({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70">
      <div className="relative w-full sm:max-w-md bg-[#141414] border border-[#2a2a2a] rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#666] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

function OtpInput({ value, onChange, label, disabled }) {
  return (
    <div>
      <p className="text-[#888] text-sm mb-2">{label}</p>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        disabled={disabled}
        placeholder="000000"
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-center text-xl tracking-[0.5em] font-mono focus:outline-none focus:border-[#8B9A7E] disabled:opacity-50"
      />
    </div>
  );
}

function ApptCard({ appt, cancPolicyHours, depositRefundHours, onCancel, onReschedule }) {
  const apptDt = new Date(`${appt.date}T${appt.start_time}:00`);
  const hoursUntil = (apptDt - new Date()) / 3_600_000;
  const withinCancWindow = cancPolicyHours !== null && hoursUntil < cancPolicyHours;
  const withinDepositWindow = !!appt.deposit_payment_intent_id && hoursUntil < depositRefundHours;

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
      <p className="text-white font-semibold">{fmtDate(appt.date)}</p>
      <p className="text-[#8B9A7E] text-sm mt-0.5 mb-2">{fmtTime(appt.start_time)} – {fmtTime(appt.end_time)}</p>
      <div className="flex gap-3 text-sm text-[#888] mb-3">
        <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{appt.barber_name}</span>
        <span className="flex items-center gap-1"><Scissors className="w-3.5 h-3.5" />{appt.service_name}</span>
      </div>
      {withinCancWindow && (
        <div className="flex items-start gap-2 bg-[#2a2000] border border-[#443300] rounded-xl px-3 py-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-[#cc9900] mt-0.5 shrink-0" />
          <p className="text-[#cc9900] text-xs leading-snug">
            Within the {cancPolicyHours}-hour cancellation window.
            {withinDepositWindow && " Your deposit may be forfeited."}
          </p>
        </div>
      )}
      {/* Vertical stack: Reschedule on top (primary), Cancel below (secondary) */}
      <div className="flex flex-col gap-2 mt-1">
        <button
          onClick={() => onReschedule(appt)}
          style={{ backgroundColor: "#8B9A7E", color: "#0f0f0f" }}
          className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reschedule
        </button>
        <button
          onClick={() => onCancel(appt)}
          style={{ color: "#cc6666", borderColor: "#3a2020", borderWidth: "1px", borderStyle: "solid" }}
          className="w-full py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
        >
          <Ban className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ClientPortal() {
  const { shopSlug } = useParams();
  const navigate = useNavigate();

  const [phase, setPhase] = useState("loading"); // loading | disclaimer | phone_entry | portal
  const [shopId, setShopId] = useState(null);
  const [shopName, setShopName] = useState("Stand Tall Barbershop");
  const [cancPolicyHours, setCancPolicyHours] = useState(null);
  const [depositRefundHours, setDepositRefundHours] = useState(24);
  const [session, setSession] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [disclaimerLoading, setDisclaimerLoading] = useState(false);

  // Phone entry
  const [phoneInput, setPhoneInput] = useState("");
  const [phonePhase, setPhonePhase] = useState("phone");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);

  // Cancel modal
  const [cancelAppt, setCancelAppt] = useState(null);
  const [cancelOtp, setCancelOtp] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelDone, setCancelDone] = useState(false);

  // Reschedule modal
  const [rescheduleAppt, setRescheduleAppt] = useState(null);
  const [rescheduleStep, setRescheduleStep] = useState("otp");
  const [rescheduleOtp, setRescheduleOtp] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleEndTime, setRescheduleEndTime] = useState("");
  const [rescheduleLoadingSlots, setRescheduleLoadingSlots] = useState(false);
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");
  const [rescheduleDone, setRescheduleDone] = useState(false);
  const [rescheduleNewDate, setRescheduleNewDate] = useState("");
  const [rescheduleNewStart, setRescheduleNewStart] = useState("");

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      if (!shopSlug) { navigate("/"); return; }

      // DEBUG — remove after confirming gate works
      console.log("[portal-debug] raw session:", localStorage.getItem(`stb_client_${shopSlug}`));

      const { data: shopRow } = await supabase
        .from("shops").select("id").eq("url_slug", shopSlug).single();
      if (!shopRow) { navigate("/book"); return; }
      setShopId(shopRow.id);

      const { data: settingsRows } = await supabase
        .from("shop_settings")
        .select("shop_name, cancellation_policy_hours, deposit_refund_hours")
        .eq("shop_id", shopRow.id)
        .limit(1);
      const s = settingsRows?.[0] || {};
      if (s.shop_name) setShopName(s.shop_name);
      if (s.cancellation_policy_hours != null) setCancPolicyHours(s.cancellation_policy_hours);
      if (s.deposit_refund_hours != null) setDepositRefundHours(s.deposit_refund_hours);

      // Show privacy disclaimer once per browser session
      if (!sessionStorage.getItem(DISCLAIMER_KEY)) {
        setPhase("disclaimer");
        return;
      }

      // OTP is always required for portal access — never skip based on session alone.
      // Session is only used to pre-fill the phone number for convenience.
      const stored = loadClientSession(shopSlug);
      if (stored?.phone) setPhoneInput(stored.phone);
      setPhase("phone_entry");
    };
    init().catch(() => setPhase("phone_entry"));
  }, [shopSlug]);

  // Reload slots when reschedule date changes in picker step
  useEffect(() => {
    if (rescheduleStep === "picker" && rescheduleDate && rescheduleAppt) {
      loadRescheduleSlots();
    }
  }, [rescheduleDate, rescheduleStep]);

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadPortalData = async (sid, phone) => {
    const [upcomingRes, pastRes] = await Promise.all([
      supabase.rpc("get_client_upcoming_bookings", { p_shop_id: sid, p_phone: phone }),
      supabase.rpc("get_client_past_bookings", { p_shop_id: sid, p_phone: phone }),
    ]);
    setUpcoming(upcomingRes.data || []);
    setPast(pastRes.data || []);
  };

  // ── Disclaimer handler ────────────────────────────────────────────────────
  const handleDisclaimerContinue = async () => {
    setDisclaimerLoading(true);
    try {
      sessionStorage.setItem(DISCLAIMER_KEY, "1");
      // OTP always required — session only used for phone pre-fill
      const stored = loadClientSession(shopSlug);
      if (stored?.phone) setPhoneInput(stored.phone);
      setPhase("phone_entry");
    } catch {
      setPhase("phone_entry");
    } finally {
      setDisclaimerLoading(false);
    }
  };

  // ── Phone entry handlers ──────────────────────────────────────────────────
  const handlePhoneSend = async () => {
    const trimmed = phoneInput.trim();
    if (!trimmed) return;
    setPhoneSubmitting(true);
    setPhoneError("");
    try {
      const { error } = await supabase.functions.invoke("sendOTP", { body: { phone: trimmed } });
      if (error) { setPhoneError("Failed to send code. Please try again."); return; }
      setPhonePhase("otp");
    } catch { setPhoneError("Something went wrong. Please try again."); }
    finally { setPhoneSubmitting(false); }
  };

  const handlePhoneVerify = async () => {
    if (phoneOtp.length < 6) return;
    setPhoneSubmitting(true);
    setPhoneError("");
    try {
      const { data, error } = await supabase.functions.invoke("verifyOTP", {
        body: { phone: phoneInput.trim(), code: phoneOtp },
      });
      if (error || !data?.success) {
        setPhoneError(data?.error || "Incorrect code. Please try again.");
        return;
      }
      const { data: clientRows } = await supabase.rpc("lookup_verified_client", {
        p_shop_id: shopId,
        p_phone: phoneInput.trim(),
      });
      const client = clientRows?.[0];
      if (!client) {
        setPhoneError("No account found for this number. Please use the booking page to create one.");
        return;
      }
      const newSession = {
        clientId: client.id,
        phone: phoneInput.trim(),
        firstName: client.first_name || client.name?.split(" ")[0] || "",
        lastName: client.last_name || client.name?.split(" ").slice(1).join(" ") || "",
        otpVerifiedAt: Date.now(),
      };
      saveClientSession(shopSlug, newSession);
      setSession(newSession);
      await loadPortalData(shopId, phoneInput.trim());
      setPhase("portal");
    } catch { setPhoneError("Something went wrong. Please try again."); }
    finally { setPhoneSubmitting(false); }
  };

  // ── Cancel handlers ───────────────────────────────────────────────────────
  const openCancelModal = async (appt) => {
    setCancelAppt(appt);
    setCancelOtp("");
    setCancelError("");
    setCancelDone(false);
    await supabase.functions.invoke("sendOTP", { body: { phone: session.phone } });
  };

  const closeCancelModal = () => {
    const wasDone = cancelDone;
    setCancelAppt(null);
    if (wasDone) loadPortalData(shopId, session.phone);
  };

  const handleCancelSubmit = async () => {
    if (cancelOtp.length < 6) return;
    setCancelSubmitting(true);
    setCancelError("");
    try {
      const { data, error } = await supabase.functions.invoke("cancel-client-booking", {
        body: {
          bookingId: cancelAppt.id,
          clientId: session.clientId,
          phone: session.phone,
          otpCode: cancelOtp,
        },
      });
      if (error || !data?.success) {
        setCancelError(data?.error || "Something went wrong. Please try again.");
        return;
      }
      refreshClientSession(shopSlug);
      setCancelDone(true);
    } catch { setCancelError("Something went wrong. Please try again."); }
    finally { setCancelSubmitting(false); }
  };

  // ── Reschedule handlers ───────────────────────────────────────────────────
  const openRescheduleModal = async (appt) => {
    setRescheduleAppt(appt);
    setRescheduleStep("otp");
    setRescheduleOtp("");
    setRescheduleDate("");
    setRescheduleSlots([]);
    setRescheduleTime("");
    setRescheduleEndTime("");
    setRescheduleNewDate("");
    setRescheduleNewStart("");
    setRescheduleError("");
    setRescheduleDone(false);
    await supabase.functions.invoke("sendOTP", { body: { phone: session.phone } });
  };

  const closeRescheduleModal = () => {
    const wasDone = rescheduleDone;
    setRescheduleAppt(null);
    if (wasDone) loadPortalData(shopId, session.phone);
  };

  const handleRescheduleNext = () => {
    if (rescheduleOtp.length < 6) {
      setRescheduleError("Please enter your 6-digit verification code.");
      return;
    }
    setRescheduleError("");
    setRescheduleStep("picker");
  };

  const loadRescheduleSlots = async () => {
    if (!rescheduleAppt || !rescheduleDate) return;
    setRescheduleLoadingSlots(true);
    setRescheduleSlots([]);
    setRescheduleTime("");
    setRescheduleEndTime("");
    try {
      const dayName = format(new Date(rescheduleDate + "T12:00:00"), "EEEE").toLowerCase();
      const { data: barberData } = await supabase
        .from("barbers")
        .select("hours, service_durations")
        .eq("id", rescheduleAppt.barber_id)
        .single();

      const dh = barberData?.hours?.[dayName];
      if (!dh || dh.off || dh.closed) {
        setRescheduleSlots([]);
        return;
      }

      const serviceDuration =
        barberData?.service_durations?.[rescheduleAppt.service_id] ??
        rescheduleAppt.duration ?? 30;

      const booked = await getBookedSlots(shopId, rescheduleDate);
      const barberBooked = booked.filter(bk =>
        bk.barber_id === rescheduleAppt.barber_id && bk.id !== rescheduleAppt.id
      );

      const today = format(new Date(), "yyyy-MM-dd");
      const nowHHMM = format(new Date(), "HH:mm");

      const allSlots = generateSlots(dh.start || "09:00", dh.end || "18:00", 15);
      const available = allSlots.filter(time => {
        if (rescheduleDate === today && time <= nowHHMM) return false;
        return !isSlotTaken(time, serviceDuration, barberBooked);
      });

      setRescheduleSlots(available.map(time => ({
        time,
        endTime: format(addMinutes(parse(time, "HH:mm", new Date()), serviceDuration), "HH:mm"),
      })));
    } catch (e) {
      console.error("[ClientPortal] slot load error:", e);
    } finally {
      setRescheduleLoadingSlots(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleDate || !rescheduleTime) {
      setRescheduleError("Please select a date and time.");
      return;
    }
    setRescheduleSubmitting(true);
    setRescheduleError("");
    try {
      const { data, error } = await supabase.functions.invoke("reschedule-client-booking", {
        body: {
          bookingId: rescheduleAppt.id,
          clientId: session.clientId,
          phone: session.phone,
          otpCode: rescheduleOtp,
          newDate: rescheduleDate,
          newStartTime: rescheduleTime,
          newEndTime: rescheduleEndTime,
        },
      });
      if (error || !data?.success) {
        setRescheduleError(data?.error || "Something went wrong. Please try again.");
        return;
      }
      refreshClientSession(shopSlug);
      setRescheduleNewDate(rescheduleDate);
      setRescheduleNewStart(rescheduleTime);
      setRescheduleDone(true);
    } catch { setRescheduleError("Something went wrong. Please try again."); }
    finally { setRescheduleSubmitting(false); }
  };

  const handleSignOut = () => {
    clearClientSession(shopSlug);
    setSession(null);
    setUpcoming([]);
    setPast([]);
    setPhoneInput("");
    setPhonePhase("phone");
    setPhoneOtp("");
    setPhoneError("");
    setPhase("phone_entry");
  };

  // ── Render: loading ───────────────────────────────────────────────────────
  if (phase === "loading") return <Spinner />;

  // ── Render: disclaimer ────────────────────────────────────────────────────
  if (phase === "disclaimer") {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center px-4 py-8">
        <Helmet><title>My Appointments — {shopName}</title></Helmet>
        <div className="max-w-sm w-full">
          <div className="flex flex-col items-center mb-8">
            <img src={LOGO_URL} alt={shopName} className="w-16 h-16 rounded-2xl mb-4" />
            <p className="text-white text-lg font-bold">{shopName}</p>
          </div>
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-[#1a2a1a] flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-[#8B9A7E]" />
              </div>
            </div>
            <h2 className="text-white font-bold text-lg text-center mb-3">Privacy Notice</h2>
            <p className="text-[#888] text-sm leading-relaxed text-center mb-6">
              To protect your privacy and prevent unauthorized access, you'll need to verify your phone number to view or modify your appointments.
            </p>
            <button
              onClick={handleDisclaimerContinue}
              disabled={disclaimerLoading}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: "#8B9A7E", color: "#0f0f0f" }}
            >
              {disclaimerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Got it, continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: phone entry ───────────────────────────────────────────────────
  if (phase === "phone_entry") {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
        <Helmet><title>My Appointments — {shopName}</title></Helmet>
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col px-4 py-8">
          <button
            onClick={() => navigate(`/book/${shopSlug}`)}
            className="flex items-center gap-1.5 text-[#888] hover:text-white transition-colors text-sm mb-8 self-start"
          >
            <ArrowLeft className="w-4 h-4" /> Back to booking
          </button>

          <div className="flex flex-col items-center mb-10">
            <img src={LOGO_URL} alt={shopName} className="w-16 h-16 rounded-2xl mb-4" />
            <h1 className="text-white text-xl font-bold">{shopName}</h1>
            <p className="text-[#888] text-sm mt-1">My Appointments</p>
          </div>

          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6">
            {phonePhase === "phone" ? (
              <>
                <h2 className="text-white font-semibold text-lg mb-1">Verify your number</h2>
                <p className="text-[#888] text-sm mb-5">We'll send a code to confirm your identity.</p>
                <label className="block text-[#888] text-sm mb-1.5">Phone number</label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handlePhoneSend()}
                  placeholder="(555) 000-0000"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#8B9A7E] mb-3"
                />
                {phoneError && <p className="text-red-400 text-sm mb-3">{phoneError}</p>}
                <button
                  onClick={handlePhoneSend}
                  disabled={phoneSubmitting || !phoneInput.trim()}
                  className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: "#8B9A7E", color: "#0f0f0f" }}
                >
                  {phoneSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Send Code
                </button>
              </>
            ) : (
              <>
                <h2 className="text-white font-semibold text-lg mb-1">Enter verification code</h2>
                <p className="text-[#888] text-sm mb-5">We sent a 6-digit code to {maskPhone(phoneInput)}.</p>
                <OtpInput
                  value={phoneOtp}
                  onChange={setPhoneOtp}
                  label="Verification code"
                  disabled={phoneSubmitting}
                />
                {phoneError && <p className="text-red-400 text-sm mt-2 mb-1">{phoneError}</p>}
                <button
                  onClick={handlePhoneVerify}
                  disabled={phoneSubmitting || phoneOtp.length < 6}
                  className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                  style={{ backgroundColor: "#8B9A7E", color: "#0f0f0f" }}
                >
                  {phoneSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  View My Appointments
                </button>
                <button
                  onClick={() => { setPhonePhase("phone"); setPhoneOtp(""); setPhoneError(""); }}
                  className="w-full text-[#666] text-sm mt-3 hover:text-[#888] transition-colors"
                >
                  ← Use a different number
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Render: portal ────────────────────────────────────────────────────────
  const displayName = cap(session?.firstName || "");

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Helmet><title>My Appointments — {shopName}</title></Helmet>

      <div className="max-w-md mx-auto w-full px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(`/book/${shopSlug}`)}
            className="flex items-center gap-1.5 text-[#888] hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Book new
          </button>
          <img src={LOGO_URL} alt={shopName} className="w-10 h-10 rounded-xl" />
          <button onClick={handleSignOut} className="text-[#666] text-sm hover:text-[#888] transition-colors">
            Sign out
          </button>
        </div>

        {/* Client info */}
        <div className="mb-6">
          <h1 className="text-white text-2xl font-bold">
            {displayName ? `${displayName}'s appointments` : "My appointments"}
          </h1>
          <p className="text-[#666] text-sm mt-1 flex items-center gap-1">
            <Phone className="w-3.5 h-3.5" />
            {maskPhone(session?.phone || "")}
          </p>
        </div>

        {/* Upcoming */}
        <div className="mb-8">
          <h2 className="text-[#8B9A7E] text-xs font-semibold uppercase tracking-widest mb-3">
            Upcoming
          </h2>
          {upcoming.length === 0 ? (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 text-center">
              <Calendar className="w-8 h-8 text-[#444] mx-auto mb-2" />
              <p className="text-[#888] text-sm">No upcoming appointments</p>
              <button
                onClick={() => navigate(`/book/${shopSlug}`)}
                className="mt-3 text-[#8B9A7E] text-sm font-medium hover:text-white transition-colors"
              >
                Book one now →
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {upcoming.map(appt => (
                <ApptCard
                  key={appt.id}
                  appt={appt}
                  cancPolicyHours={cancPolicyHours}
                  depositRefundHours={depositRefundHours}
                  onCancel={openCancelModal}
                  onReschedule={openRescheduleModal}
                />
              ))}
            </div>
          )}
        </div>

        {/* Past */}
        {past.length > 0 && (
          <div>
            <h2 className="text-[#8B9A7E] text-xs font-semibold uppercase tracking-widest mb-3">
              Past Appointments
            </h2>
            <div className="flex flex-col gap-2">
              {past.map(appt => (
                <div key={appt.id} className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[#888] text-sm">{fmtDate(appt.date)}</p>
                      <p className="text-[#666] text-xs mt-0.5">{fmtTime(appt.start_time)}</p>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full border"
                      style={appt.status === "cancelled"
                        ? { color: "#cc6666", borderColor: "#3a2020", backgroundColor: "#2a1a1a" }
                        : { color: "#8B9A7E", borderColor: "#2a3a2a", backgroundColor: "#1a2a1a" }
                      }
                    >
                      {appt.status === "cancelled" ? "cancelled" : "completed"}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs text-[#555] mt-2">
                    <span>{appt.barber_name}</span>
                    <span>·</span>
                    <span>{appt.service_name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Cancel modal ── */}
      {cancelAppt && (
        <Modal onClose={closeCancelModal}>
          <div className="p-6">
            {cancelDone ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-[#8B9A7E] mx-auto mb-3" />
                <h2 className="text-white font-bold text-xl mb-2">Appointment Cancelled</h2>
                <p className="text-[#888] text-sm">
                  Your appointment on {fmtDate(cancelAppt.date)} at {fmtTime(cancelAppt.start_time)} has been cancelled.
                </p>
                <button
                  onClick={closeCancelModal}
                  className="mt-6 w-full py-3 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: "#8B9A7E", color: "#0f0f0f" }}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-white font-bold text-xl mb-1 pr-6">Cancel Appointment</h2>
                <div className="bg-[#1a1a1a] rounded-xl p-3 mb-4 mt-3">
                  <p className="text-white text-sm font-medium">{fmtDate(cancelAppt.date)}</p>
                  <p className="text-[#8B9A7E] text-sm">{fmtTime(cancelAppt.start_time)} – {fmtTime(cancelAppt.end_time)}</p>
                  <p className="text-[#666] text-xs mt-1">{cancelAppt.barber_name} · {cancelAppt.service_name}</p>
                </div>

                {(() => {
                  const hoursUntil = (new Date(`${cancelAppt.date}T${cancelAppt.start_time}:00`) - new Date()) / 3_600_000;
                  return !!cancelAppt.deposit_payment_intent_id && hoursUntil < depositRefundHours ? (
                    <div className="flex items-start gap-2 bg-[#2a2000] border border-[#443300] rounded-xl px-3 py-2 mb-4">
                      <AlertTriangle className="w-4 h-4 text-[#cc9900] mt-0.5 shrink-0" />
                      <p className="text-[#cc9900] text-xs leading-snug">
                        You're within the cancellation window. Your deposit will be forfeited.
                      </p>
                    </div>
                  ) : null;
                })()}

                <p className="text-[#888] text-sm mb-3">
                  We sent a verification code to {maskPhone(session?.phone || "")}.
                </p>
                <OtpInput
                  value={cancelOtp}
                  onChange={setCancelOtp}
                  label="Verification code"
                  disabled={cancelSubmitting}
                />
                {cancelError && <p className="text-red-400 text-sm mt-2">{cancelError}</p>}

                <div className="flex flex-col gap-2 mt-4">
                  <button
                    onClick={handleCancelSubmit}
                    disabled={cancelSubmitting || cancelOtp.length < 6}
                    className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: "#cc4444", color: "#fff" }}
                  >
                    {cancelSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Cancel Appointment
                  </button>
                  <button
                    onClick={closeCancelModal}
                    className="w-full text-[#888] text-sm py-2 hover:text-white transition-colors"
                  >
                    Keep Appointment
                  </button>
                </div>
                <button
                  onClick={() => supabase.functions.invoke("sendOTP", { body: { phone: session?.phone } })}
                  className="w-full text-[#666] text-xs mt-2 hover:text-[#888] transition-colors"
                >
                  Resend code
                </button>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* ── Reschedule modal ── */}
      {rescheduleAppt && (
        <Modal onClose={closeRescheduleModal}>
          <div className="p-6">
            {rescheduleDone ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-[#8B9A7E] mx-auto mb-3" />
                <h2 className="text-white font-bold text-xl mb-2">Appointment Rescheduled</h2>
                <p className="text-[#888] text-sm">
                  Your new appointment is on {fmtDate(rescheduleNewDate)} at {fmtTime(rescheduleNewStart)}.
                  {rescheduleAppt.barber_name ? ` With ${rescheduleAppt.barber_name}.` : ""}
                </p>
                <button
                  onClick={closeRescheduleModal}
                  className="mt-6 w-full py-3 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: "#8B9A7E", color: "#0f0f0f" }}
                >
                  Done
                </button>
              </div>
            ) : rescheduleStep === "otp" ? (
              <>
                <h2 className="text-white font-bold text-xl mb-1 pr-6">Reschedule</h2>
                <div className="bg-[#1a1a1a] rounded-xl p-3 mb-4 mt-3">
                  <p className="text-[#888] text-xs uppercase tracking-wide mb-1">Current appointment</p>
                  <p className="text-white text-sm font-medium">{fmtDate(rescheduleAppt.date)}</p>
                  <p className="text-[#8B9A7E] text-sm">{fmtTime(rescheduleAppt.start_time)}</p>
                  <p className="text-[#666] text-xs mt-1">{rescheduleAppt.barber_name} · {rescheduleAppt.service_name}</p>
                </div>
                <p className="text-[#888] text-sm mb-3">
                  We sent a verification code to {maskPhone(session?.phone || "")}.
                </p>
                <OtpInput
                  value={rescheduleOtp}
                  onChange={setRescheduleOtp}
                  label="Verification code"
                  disabled={rescheduleSubmitting}
                />
                {rescheduleError && <p className="text-red-400 text-sm mt-2">{rescheduleError}</p>}
                <button
                  onClick={handleRescheduleNext}
                  disabled={rescheduleOtp.length < 6}
                  className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50 mt-4"
                  style={{ backgroundColor: "#8B9A7E", color: "#0f0f0f" }}
                >
                  Next →
                </button>
                <button
                  onClick={() => supabase.functions.invoke("sendOTP", { body: { phone: session?.phone } })}
                  className="w-full text-[#666] text-xs mt-2 hover:text-[#888] transition-colors"
                >
                  Resend code
                </button>
              </>
            ) : (
              <>
                <h2 className="text-white font-bold text-xl mb-1 pr-6">Choose New Time</h2>
                <p className="text-[#888] text-sm mb-4">
                  {rescheduleAppt.barber_name} · {rescheduleAppt.service_name}
                </p>

                <label className="block text-[#888] text-sm mb-1.5">Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                  max={format(addDays(new Date(), 60), "yyyy-MM-dd")}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#8B9A7E] mb-4"
                />

                {rescheduleDate && (
                  <div className="mb-4">
                    <p className="text-[#888] text-sm mb-2">Available times</p>
                    {rescheduleLoadingSlots ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-5 h-5 text-[#8B9A7E] animate-spin" />
                      </div>
                    ) : rescheduleSlots.length === 0 ? (
                      <p className="text-[#555] text-sm text-center py-3">
                        No available times on this date. Try another day.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {rescheduleSlots.map(slot => (
                          <button
                            key={slot.time}
                            onClick={() => { setRescheduleTime(slot.time); setRescheduleEndTime(slot.endTime); }}
                            className="py-2 rounded-xl text-sm font-medium border transition-colors"
                            style={rescheduleTime === slot.time
                              ? { backgroundColor: "#8B9A7E", color: "#0f0f0f", borderColor: "#8B9A7E" }
                              : { color: "#888", borderColor: "#2a2a2a" }
                            }
                          >
                            {fmtTime(slot.time)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {rescheduleError && <p className="text-red-400 text-sm mb-3">{rescheduleError}</p>}

                <button
                  onClick={handleRescheduleSubmit}
                  disabled={rescheduleSubmitting || !rescheduleDate || !rescheduleTime}
                  className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: "#8B9A7E", color: "#0f0f0f" }}
                >
                  {rescheduleSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Confirm Reschedule
                </button>
                <button
                  onClick={() => { setRescheduleStep("otp"); setRescheduleDate(""); setRescheduleSlots([]); setRescheduleTime(""); }}
                  className="w-full text-[#666] text-sm py-2 mt-1 hover:text-[#888] transition-colors"
                >
                  ← Back
                </button>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
