import React, { useState, useEffect, useMemo, useRef } from "react";
import { entities } from "@/api/entities";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Scissors, ChevronRight, ArrowLeft, Clock, CheckCircle2, User, Calendar, Tag, Copy, Instagram, Facebook, Globe, Phone, X, CalendarClock, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, parse, addMinutes } from "date-fns";

const LOGO_URL =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6993eba91209ee0a1089f355/fd9cfe023_6f5fd5cc-8fc9-4041-9d87-c24e77a3bc58.png";

const ANY_BARBER = { id: "any", name: "Any Barber" };

const fadeSlide = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.22, ease: "easeOut" },
};

function StepHeader({ stepLabel, title, onBack, progress, logoUrl }) {
  return (
    <>
      <div className="sticky top-0 z-10 flex items-center gap-4 px-6 py-4 border-b border-white/10" style={{ background: "#0A0A0A" }}>
        <button
          onClick={onBack}
          className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">{stepLabel}</p>
          <h2 className="text-white font-bold text-lg leading-tight">{title}</h2>
        </div>
        <img src={logoUrl || LOGO_URL} alt="" className="w-8 h-8 rounded-lg ml-auto opacity-60 object-cover" />
      </div>
      <div className="h-0.5 bg-white/10">
        <div className="h-full bg-[#8B9A7E] transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
    </>
  );
}

// ─── My Appointments flow ─────────────────────────────────────────────────────

function PhoneEntryScreen({ onBack, onSent }) {
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) { setError("Enter a valid 10-digit phone number."); return; }
    setSending(true);
    setError("");
    try {
      const { error: fnErr } = await supabase.functions.invoke("sendOTP", { body: { phone: digits } });
      if (fnErr) { setError("Failed to send code. Try again."); return; }
      onSent(digits);
    } catch {
      setError("Failed to send code. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div {...fadeSlide} className="flex flex-col items-center justify-center min-h-screen px-6" style={{ background: "#0A0A0A" }}>
      <div className="w-full max-w-sm">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6" style={{ background: "#1f2a1f" }}>
          <Phone className="w-6 h-6" style={{ color: "#8B9A7E" }} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">View My Appointments</h2>
        <p className="text-white/40 text-sm mb-8">Enter your phone number and we'll text you a verification code.</p>
        <input
          type="tel"
          value={phone}
          onChange={e => { setPhone(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="(555) 000-0000"
          className="w-full px-4 py-3 rounded-xl text-white text-base outline-none mb-3"
          style={{ background: "#141414", border: "1px solid #2a2a2a" }}
          autoFocus
        />
        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
        <button
          onClick={handleSend}
          disabled={sending}
          className="w-full py-3.5 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
          style={{ background: sending ? "#4a5a44" : "#8B9A7E" }}
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {sending ? "Sending…" : "Send Code"}
        </button>
      </div>
    </motion.div>
  );
}

function OtpEntryScreen({ phone, onBack, onVerified }) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) { setError("Enter the 6-digit code."); return; }
    setVerifying(true);
    setError("");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("verifyOTP", { body: { phone, code } });
      if (fnErr || data?.error) { setError(data?.error || "Verification failed. Try again."); return; }
      onVerified(data.client, data.bookings);
    } catch {
      setError("Verification failed. Try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    await supabase.functions.invoke("sendOTP", { body: { phone } });
    setResending(false);
    setResent(true);
    setTimeout(() => setResent(false), 4000);
  };

  return (
    <motion.div {...fadeSlide} className="flex flex-col items-center justify-center min-h-screen px-6" style={{ background: "#0A0A0A" }}>
      <div className="w-full max-w-sm">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6" style={{ background: "#1f2a1f" }}>
          <Phone className="w-6 h-6" style={{ color: "#8B9A7E" }} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Enter Your Code</h2>
        <p className="text-white/40 text-sm mb-8">
          We sent a 6-digit code to <span className="text-white/70">{phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")}</span>.
        </p>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={e => { setCode(e.target.value.replace(/\D/g, "")); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleVerify()}
          placeholder="000000"
          className="w-full px-4 py-3 rounded-xl text-white text-2xl text-center tracking-[0.5em] font-mono outline-none mb-3"
          style={{ background: "#141414", border: "1px solid #2a2a2a" }}
          autoFocus
        />
        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
        <button
          onClick={handleVerify}
          disabled={verifying || code.length !== 6}
          className="w-full py-3.5 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 mb-4"
          style={{ background: verifying || code.length !== 6 ? "#2e3a2e" : "#8B9A7E", opacity: code.length !== 6 && !verifying ? 0.5 : 1 }}
        >
          {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {verifying ? "Verifying…" : "Verify Code"}
        </button>
        <p className="text-center text-white/30 text-sm">
          Didn't get it?{" "}
          <button onClick={handleResend} disabled={resending} className="text-[#8B9A7E] hover:underline">
            {resending ? "Sending…" : resent ? "Sent!" : "Resend"}
          </button>
        </p>
      </div>
    </motion.div>
  );
}

function AppointmentsScreen({ client, bookings: initialBookings, onBack }) {
  const [bookings, setBookings] = useState(initialBookings);
  const [cancelling, setCancelling] = useState(null);

  const handleCancel = async (id) => {
    setCancelling(id);
    try {
      await entities.Booking.update(id, { status: "cancelled" });
      setBookings(prev => prev.filter(b => b.id !== id));
    } finally {
      setCancelling(null);
    }
  };

  const formatApptDate = (dateStr) =>
    format(new Date(dateStr + "T12:00:00"), "EEE, MMM d");

  const formatApptTime = (t) =>
    format(parse(t, "HH:mm", new Date()), "h:mm a");

  return (
    <motion.div {...fadeSlide} className="min-h-screen" style={{ background: "#0A0A0A" }}>
      <div className="sticky top-0 z-10 flex items-center gap-4 px-6 py-4 border-b border-white/10" style={{ background: "#0A0A0A" }}>
        <button onClick={onBack} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">My Appointments</p>
          <h2 className="text-white font-bold text-lg leading-tight">
            {client ? `Hey, ${client.name.split(" ")[0]}` : "Upcoming Bookings"}
          </h2>
        </div>
        <CalendarClock className="w-5 h-5 ml-auto" style={{ color: "#8B9A7E" }} />
      </div>

      <div className="px-6 py-6 max-w-md mx-auto">
        {bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CalendarClock className="w-10 h-10 mb-4 opacity-20" style={{ color: "#8B9A7E" }} />
            <p className="text-white/40 text-sm">No upcoming appointments found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map(b => (
              <div key={b.id} className="rounded-2xl border p-4" style={{ background: "#111", borderColor: "#2a2a2a" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{b.service_name}</p>
                    <p className="text-white/50 text-xs mt-0.5">with {b.barber_name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: "#1f2a1f", color: "#8B9A7E" }}>
                        {formatApptDate(b.date)}
                      </span>
                      <span className="text-[11px] text-white/40">
                        {formatApptTime(b.start_time)}{b.end_time ? ` – ${formatApptTime(b.end_time)}` : ""}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancel(b.id)}
                    disabled={cancelling === b.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 border border-red-900/40 hover:bg-red-900/20 transition-colors flex-shrink-0"
                  >
                    {cancelling === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Legal content ────────────────────────────────────────────────────────────

const TERMS_SECTIONS = [
  {
    heading: "1. Appointment Booking",
    body: "By scheduling an appointment through standtallbooking.com you agree to these Terms & Conditions. Appointments are subject to barber availability. Stand Tall Barbershop reserves the right to modify or cancel appointments in exceptional circumstances, and you will be notified as soon as possible if this occurs.",
  },
  {
    heading: "2. Cancellation Policy",
    body: "We ask that you cancel or reschedule at least 24 hours before your appointment. Cancellations made with less than 24 hours' notice may result in a cancellation fee or restricted access to future online bookings.",
  },
  {
    heading: "3. No-Show Policy",
    body: "Clients who do not arrive for a scheduled appointment without prior notice will be recorded as a no-show. Repeated no-shows may result in restricted online booking access or a required deposit for future appointments.",
  },
  {
    heading: "4. SMS & Email Communications",
    body: "By booking an appointment you consent to receive SMS text messages and emails from Stand Tall Barbershop related to your appointment, including confirmations, reminders, and updates. Standard message and data rates may apply. You may opt out at any time by replying STOP to any SMS or contacting us directly.",
  },
  {
    heading: "5. Refund Policy",
    body: "Services rendered are non-refundable. If you are dissatisfied with a service, contact us within 7 days and we will do our best to make it right. Prepaid deposits are non-refundable if adequate cancellation notice is not provided.",
  },
  {
    heading: "6. Limitation of Liability",
    body: "Stand Tall Barbershop shall not be liable for any indirect, incidental, or consequential damages arising from use of our booking system or services. Our total liability in connection with any claim shall not exceed the amount paid for the specific service giving rise to that claim.",
  },
];

const PRIVACY_SECTIONS = [
  {
    heading: "1. Information We Collect",
    body: "When you book an appointment through standtallbooking.com we collect your full name, phone number, and email address. This information is provided voluntarily during the booking process.",
  },
  {
    heading: "2. How We Use Your Information",
    body: "We use your information solely to manage your appointment. This includes sending booking confirmations, appointment reminders via SMS and email, and other communications directly related to your visit.",
  },
  {
    heading: "3. We Do Not Sell Your Data",
    body: "Stand Tall Barbershop does not sell, rent, trade, or share your personal information with third parties for marketing purposes. Your data is used exclusively to provide and improve our booking and barbershop services.",
  },
  {
    heading: "4. Opting Out of Communications",
    body: "You may opt out of SMS communications at any time by replying STOP to any text message we send. To opt out of emails, reply with 'Unsubscribe' in the subject line or contact us directly. Opting out of reminders may result in missed appointment notifications.",
  },
  {
    heading: "5. Data Retention",
    body: "We retain your personal information for as long as necessary to provide our services and maintain accurate appointment records. You may request deletion of your data at any time by contacting us. We will respond to deletion requests within 30 days.",
  },
  {
    heading: "6. Contact Us",
    body: "If you have questions or concerns about this Privacy Policy or how your data is handled, contact us through our website at standtallbooking.com or by phone at our listed contact number.",
  },
];

function LegalModal({ title, sections, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative flex flex-col w-full max-w-lg mx-auto my-auto max-h-[90vh] rounded-2xl overflow-hidden"
        style={{ background: "#111", border: "1px solid #2a2a2a" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "#2a2a2a" }}>
          <h2 className="text-white font-bold text-base">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-5">
          {sections.map(({ heading, body }) => (
            <div key={heading}>
              <p className="text-white/80 text-sm font-semibold mb-1">{heading}</p>
              <p className="text-white/45 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
          <p className="text-white/20 text-xs pt-2 pb-1">Last updated: {new Date().getFullYear()}. standtallbooking.com</p>
        </div>
      </div>
    </div>
  );
}

// ─── Welcome Step ─────────────────────────────────────────────────────────────

const SOCIAL_ICONS = { instagram: Instagram, facebook: Facebook, tiktok: Globe };

function parseSocialLinks(raw) {
  if (!raw) return {};
  if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return {}; } }
  return raw;
}

function WelcomeStep({ onStart, onViewAppointments, shopName, logoUrl, shopAddress, shopPhone, showShopPhone, shopEmail, showShopEmail, socialLinks }) {
  const [legalModal, setLegalModal] = useState(null); // "terms" | "privacy" | null
  const displayLogo = logoUrl || LOGO_URL;
  const displayName = shopName || "Stand Tall Barbershop";
  const enabledSocials = Object.entries(socialLinks || {}).filter(([, v]) => v?.enabled && v?.url);

  const contactRows = [
    shopAddress                          && { label: shopAddress,  text: shopAddress },
    showShopPhone && shopPhone           && { label: shopPhone,    text: shopPhone   },
    showShopEmail && shopEmail           && { label: shopEmail,    text: shopEmail   },
  ].filter(Boolean);

  return (
    <motion.div {...fadeSlide} className="flex flex-col items-center justify-center min-h-screen px-6 text-center" style={{ background: "#0A0A0A" }}>
      <img src={displayLogo} alt={displayName} className="w-28 h-28 rounded-2xl shadow-2xl mb-8 object-cover" />
      <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">{displayName}</h1>
      <p className="text-white/50 text-lg mb-10 max-w-sm">
        Book your next cut online — no calls, no waiting.
      </p>
      <button
        onClick={onStart}
        className="flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-white transition-all"
        style={{ background: "#8B9A7E" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#6B7A5E")}
        onMouseLeave={e => (e.currentTarget.style.background = "#8B9A7E")}
      >
        Book an Appointment
        <ChevronRight className="w-5 h-5" />
      </button>

      <button
        onClick={onViewAppointments}
        className="mt-3 flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white transition-colors"
        style={{ background: "#141414" }}
        onMouseEnter={e => (e.currentTarget.style.color = "white")}
        onMouseLeave={e => (e.currentTarget.style.color = "")}
      >
        <CalendarClock className="w-4 h-4" />
        View My Appointments
      </button>

      {(contactRows.length > 0 || enabledSocials.length > 0) && (
        <div className="mt-10 flex flex-col items-center gap-3 w-full max-w-xs">
          {contactRows.map(({ label, text }) => (
            <div key={text} className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl" style={{ background: "#141414" }}>
              <span className="text-white/50 text-sm truncate">{label}</span>
              <CopyButton text={text} />
            </div>
          ))}
          {enabledSocials.length > 0 && (
            <div className="flex items-center gap-3 mt-1">
              {enabledSocials.map(([key, { url }]) => {
                const Icon = SOCIAL_ICONS[key] || Globe;
                return (
                  <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-lg text-white/30 hover:text-white transition-colors"
                    style={{ background: "#141414" }}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}

      <p className="mt-10 text-white/20 text-xs text-center max-w-xs leading-relaxed">
        By booking an appointment you agree to receive SMS, email, and phone communications regarding your appointment.
      </p>

      <p className="mt-3 text-white/20 text-xs text-center">
        <button onClick={() => setLegalModal("terms")} className="hover:text-white/50 transition-colors underline underline-offset-2">
          Terms &amp; Conditions
        </button>
        <span className="mx-2">·</span>
        <button onClick={() => setLegalModal("privacy")} className="hover:text-white/50 transition-colors underline underline-offset-2">
          Privacy Policy
        </button>
      </p>

      {legalModal === "terms" && (
        <LegalModal title="Terms & Conditions" sections={TERMS_SECTIONS} onClose={() => setLegalModal(null)} />
      )}
      {legalModal === "privacy" && (
        <LegalModal title="Privacy Policy" sections={PRIVACY_SECTIONS} onClose={() => setLegalModal(null)} />
      )}
    </motion.div>
  );
}

// ─── Barber Step ──────────────────────────────────────────────────────────────

function BarberStep({ barbers, onSelect, onBack }) {
  return (
    <motion.div {...fadeSlide} className="min-h-screen" style={{ background: "#0A0A0A" }}>
      <StepHeader stepLabel="Step 1 of 5" title="Choose Your Barber" onBack={onBack} progress={20} />
      <div className="px-6 py-8">
        <p className="text-white/40 text-sm mb-6">
          {barbers.length === 0
            ? "No barbers available for online booking."
            : "Select the barber you'd like to book with."}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
          {/* Any Barber card — always first */}
          <button
            onClick={() => onSelect(ANY_BARBER)}
            className="group sm:col-span-2 flex items-center gap-4 p-5 rounded-2xl border text-left transition-all"
            style={{ background: "#141414", borderColor: "#2a2a2a" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#8B9A7E"; e.currentTarget.style.background = "#1a1f1a"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.background = "#141414"; }}
          >
            <div className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: "#1f2a1f" }}>
              <Scissors className="w-7 h-7" style={{ color: "#8B9A7E" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-base">Any Barber</p>
              <p className="text-white/40 text-xs mt-0.5">First available across all barbers</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-[#8B9A7E] transition-colors flex-shrink-0" />
          </button>
          {barbers.map((barber) => (
            <button
              key={barber.id}
              onClick={() => onSelect(barber)}
              className="group flex items-center gap-4 p-5 rounded-2xl border text-left transition-all"
              style={{ background: "#141414", borderColor: "#2a2a2a" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#8B9A7E"; e.currentTarget.style.background = "#1a1f1a"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.background = "#141414"; }}
            >
              <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ background: "#1f2a1f" }}>
                {barber.photo_url
                  ? <img src={barber.photo_url} alt={barber.name} className="w-full h-full object-cover" />
                  : <Scissors className="w-7 h-7" style={{ color: "#8B9A7E" }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-base truncate">{barber.name}</p>
                <p className="text-white/40 text-xs mt-0.5">Available for booking</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-[#8B9A7E] transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Service Step ─────────────────────────────────────────────────────────────

function ServiceStep({ services, barber, onSelect, onBack }) {
  const displayDuration = (svc) => {
    const mins = barber?.service_durations?.[svc.id] ?? svc.duration ?? 30;
    return mins >= 60
      ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ""}`
      : `${mins}m`;
  };

  return (
    <motion.div {...fadeSlide} className="min-h-screen" style={{ background: "#0A0A0A" }}>
      <StepHeader stepLabel="Step 2 of 5" title="Choose a Service" onBack={onBack} progress={40} />
      <div className="px-6 py-8">
        <p className="text-white/40 text-sm mb-6">
          {services.length === 0
            ? "No services available."
            : `Booking with ${barber?.name} — select a service below.`}
        </p>
        <div className="flex flex-col gap-3 max-w-xl mx-auto">
          {services.map((svc) => (
            <button
              key={svc.id}
              onClick={() => onSelect(svc)}
              className="group flex items-center gap-4 p-5 rounded-2xl border text-left transition-all"
              style={{ background: "#141414", borderColor: "#2a2a2a" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#8B9A7E"; e.currentTarget.style.background = "#1a1f1a"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.background = "#141414"; }}
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#1f2a1f" }}>
                <Scissors className="w-5 h-5" style={{ color: "#8B9A7E" }} />
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-base truncate">{svc.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-white/40 text-xs">
                    <Clock className="w-3 h-3" />
                    {displayDuration(svc)}
                  </span>
                  {svc.description && (
                    <span className="text-white/30 text-xs truncate">{svc.description}</span>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="text-right flex-shrink-0">
                <p className="text-white font-bold text-lg">
                  {svc.price > 0 ? `$${Number(svc.price).toFixed(0)}` : "—"}
                </p>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-[#8B9A7E] transition-colors ml-auto mt-1" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Guest Prompt Step ────────────────────────────────────────────────────────

function GuestPromptStep({ onYes, onNo, onBack }) {
  return (
    <motion.div {...fadeSlide} className="flex flex-col items-center justify-center min-h-screen px-6" style={{ background: "#0A0A0A" }}>
      <div className="w-full max-w-sm">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-10 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: "#1f2a1f" }}>
          <Users className="w-8 h-8" style={{ color: "#8B9A7E" }} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Add a Guest?</h2>
        <p className="text-white/40 text-sm mb-8 leading-relaxed">
          Book a back-to-back appointment for someone else at the same time — both appointments will be confirmed together.
        </p>
        <button
          onClick={onYes}
          className="w-full py-3.5 rounded-xl font-semibold text-white mb-3 transition-all"
          style={{ background: "#8B9A7E" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#6B7A5E")}
          onMouseLeave={e => (e.currentTarget.style.background = "#8B9A7E")}
        >
          Yes, add a guest
        </button>
        <button
          onClick={onNo}
          className="w-full py-3.5 rounded-xl font-semibold transition-all"
          style={{ background: "#141414", border: "1px solid #2a2a2a", color: "#aaa" }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "#8B9A7E")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "#2a2a2a")}
        >
          No thanks, just me
        </button>
      </div>
    </motion.div>
  );
}

// ─── Guest Form Step ──────────────────────────────────────────────────────────

function GuestFormStep({ allServices, allBarbers, guestName, guestService, guestBarber, guestTiming, onNameChange, onServiceChange, onBarberChange, onTimingChange, onNext, onBack }) {
  const allBarbersWithAny = [ANY_BARBER, ...allBarbers];
  const canContinue = guestName.trim() && guestService && guestBarber;

  const TIMING_OPTIONS = [
    { value: "back_to_back", label: "Back to back", desc: "Guest starts after yours ends" },
    { value: "same_time",    label: "Same time",    desc: "Both served simultaneously" },
  ];

  return (
    <motion.div {...fadeSlide} className="min-h-screen" style={{ background: "#0A0A0A" }}>
      <StepHeader stepLabel="Guest Details" title="Add a Guest" onBack={onBack} progress={50} />
      <div className="px-6 py-8 max-w-md mx-auto space-y-6">

        {/* Guest name */}
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-2">Guest Name</p>
          <input
            type="text"
            value={guestName}
            onChange={e => onNameChange(e.target.value)}
            placeholder="Enter guest's name"
            className="w-full px-4 py-3 rounded-xl text-white text-base outline-none"
            style={{ background: "#141414", border: "1px solid #2a2a2a" }}
            autoFocus
            onFocus={e => (e.currentTarget.style.borderColor = "#8B9A7E")}
            onBlur={e => (e.currentTarget.style.borderColor = "#2a2a2a")}
          />
        </div>

        {/* Guest service */}
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-2">Guest's Service</p>
          <div className="flex flex-col gap-2">
            {allServices.map(svc => {
              const selected = guestService?.id === svc.id;
              return (
                <button
                  key={svc.id}
                  onClick={() => onServiceChange(svc)}
                  className="flex items-center gap-3 p-4 rounded-xl border text-left transition-all"
                  style={{ background: selected ? "#1a2a1a" : "#141414", borderColor: selected ? "#8B9A7E" : "#2a2a2a" }}
                >
                  <Scissors className="w-4 h-4 flex-shrink-0" style={{ color: "#8B9A7E" }} />
                  <span className="text-white text-sm font-medium flex-1">{svc.name}</span>
                  {svc.price > 0 && <span className="text-white/40 text-sm">${Number(svc.price).toFixed(0)}</span>}
                  {selected && <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#8B9A7E" }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Guest barber */}
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-2">Guest's Barber</p>
          <div className="flex flex-col gap-2">
            {allBarbersWithAny.map(b => {
              const selected = guestBarber?.id === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => onBarberChange(b)}
                  className="flex items-center gap-3 p-4 rounded-xl border text-left transition-all"
                  style={{ background: selected ? "#1a2a1a" : "#141414", borderColor: selected ? "#8B9A7E" : "#2a2a2a" }}
                >
                  <User className="w-4 h-4 flex-shrink-0" style={{ color: "#8B9A7E" }} />
                  <span className="text-white text-sm font-medium flex-1">{b.name}</span>
                  {selected && <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#8B9A7E" }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Appointment timing */}
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-2">When would you like the guest's appointment?</p>
          <div className="flex gap-2">
            {TIMING_OPTIONS.map(opt => {
              const sel = guestTiming === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => onTimingChange(opt.value)}
                  className="flex-1 p-4 rounded-xl border text-left transition-all"
                  style={{ background: sel ? "#1a2a1a" : "#141414", borderColor: sel ? "#8B9A7E" : "#2a2a2a" }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white text-sm font-semibold">{opt.label}</p>
                    {sel && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#8B9A7E" }} />}
                  </div>
                  <p className="text-white/40 text-xs leading-snug">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={onNext}
          disabled={!canContinue}
          className="w-full py-3.5 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
          style={{
            background: canContinue ? "#8B9A7E" : "#2e3a2e",
            opacity: canContinue ? 1 : 0.5,
            cursor: canContinue ? "pointer" : "not-allowed",
          }}
          onMouseEnter={e => { if (canContinue) e.currentTarget.style.background = "#6B7A5E"; }}
          onMouseLeave={e => { if (canContinue) e.currentTarget.style.background = "#8B9A7E"; }}
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Date + Time Step ─────────────────────────────────────────────────────────

function generateSlots(start, end, intervalMins) {
  const slots = [];
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let cur = sh * 60 + sm;
  const endMins = eh * 60 + em;
  while (cur < endMins) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    slots.push({ time, label: format(parse(time, "HH:mm", new Date()), "h:mm a") });
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

function DateTimeStep({ barber, service, maxDays = 60, onSelect, onBack, allBarbers = [], minNotice = 0, guestService = null, guestBarber = null, guestTiming = "back_to_back" }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [guestBookings, setGuestBookings] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [findingNext, setFindingNext] = useState(false);
  const [nextSlots, setNextSlots] = useState([]);
  const [shownSlotKeys, setShownSlotKeys] = useState(new Set());
  const [loadingMore, setLoadingMore] = useState(false);
  const [slotsExhausted, setSlotsExhausted] = useState(false);
  const scrollRef = useRef(null);
  const bookingsCacheRef = useRef({});

  const isAny = barber?.id === "any";
  const serviceDuration = barber?.service_durations?.[service?.id] ?? service?.duration ?? 30;

  const searchSlots = async (skip, limit, isMore) => {
    isMore ? setLoadingMore(true) : setFindingNext(true);
    const found = [];
    try {
      const today = new Date();
      // cutoff = now + min notice; slots at or before cutoff are un-bookable today
      const cutoffHHMM = format(addMinutes(today, minNotice), "HH:mm");

      for (let i = 0; i < maxDays && found.length < limit; i++) {
        const d = addDays(today, i);
        const dateStr = format(d, "yyyy-MM-dd");
        const dayName = format(d, "EEEE").toLowerCase();
        const isToday = i === 0;

        if (isAny) {
          const working = allBarbers.filter(b => {
            const dh = b.hours?.[dayName];
            return dh && !dh.off && !dh.closed;
          });
          if (working.length === 0) continue;
          try {
            if (!bookingsCacheRef.current[dateStr]) {
              bookingsCacheRef.current[dateStr] = await entities.Booking.filter({ date: dateStr });
            }
            const dayBookings = bookingsCacheRef.current[dateStr];
            const timeToBarber = new Map();
            for (const wb of working) {
              const dh = wb.hours[dayName];
              const daySlots = generateSlots(dh.start || "09:00", dh.end || "18:00", 30);
              for (const s of daySlots) {
                if (timeToBarber.has(s.time)) continue;
                const key = `${dateStr}|${s.time}`;
                if (skip.has(key)) continue;
                if (isToday && s.time <= cutoffHHMM) continue;
                const free = !isSlotTaken(s.time, serviceDuration, dayBookings.filter(bk => bk.barber_id === wb.id));
                if (free) timeToBarber.set(s.time, wb.name);
              }
            }
            const sorted = Array.from(timeToBarber.entries()).sort(([ta], [tb]) => ta.localeCompare(tb));
            for (const [time, barberName] of sorted) {
              if (found.length >= limit) break;
              found.push({
                dateStr, time, barberName,
                dayLabel: format(d, "EEE"),
                dateLabel: format(d, "MMM d"),
                timeLabel: format(parse(time, "HH:mm", new Date()), "h:mm a"),
              });
            }
          } catch (e) {
            console.error("[NextAvailable] error checking", dateStr, e);
          }
        } else {
          const dayHours = barber?.hours?.[dayName];
          if (!dayHours || dayHours.off || dayHours.closed) continue;
          try {
            if (!bookingsCacheRef.current[dateStr]) {
              bookingsCacheRef.current[dateStr] = await entities.Booking.filter({ barber_id: barber.id, date: dateStr });
            }
            const dayBookings = bookingsCacheRef.current[dateStr];
            const daySlots = generateSlots(dayHours.start || "09:00", dayHours.end || "18:00", 30);
            for (const s of daySlots) {
              if (found.length >= limit) break;
              const key = `${dateStr}|${s.time}`;
              if (skip.has(key)) continue;
              if (isToday && s.time <= cutoffHHMM) continue;
              if (!isSlotTaken(s.time, serviceDuration, dayBookings)) {
                found.push({
                  dateStr, time: s.time, barberName: barber.name,
                  dayLabel: format(d, "EEE"),
                  dateLabel: format(d, "MMM d"),
                  timeLabel: format(parse(s.time, "HH:mm", new Date()), "h:mm a"),
                });
              }
            }
          } catch (e) {
            console.error("[NextAvailable] error checking", dateStr, e);
          }
        }
      }

      const newKeys = new Set(skip);
      found.forEach(f => newKeys.add(`${f.dateStr}|${f.time}`));
      setShownSlotKeys(newKeys);
      setSlotsExhausted(found.length < limit);
      if (isMore) setNextSlots(prev => [...prev, ...found]);
      else setNextSlots(found);
    } catch (e) {
      console.error("[searchSlots] unexpected error:", e);
      setSlotsExhausted(true);
    } finally {
      if (isMore) setLoadingMore(false);
      else setFindingNext(false);
    }
  };

  const handleNextAvailable = () => {
    bookingsCacheRef.current = {};
    setNextSlots([]);
    setShownSlotKeys(new Set());
    setSlotsExhausted(false);
    searchSlots(new Set(), 5, false);
  };

  const handleSeeMore = () => {
    searchSlots(shownSlotKeys, 5, true);
  };

  // Build date range — always fresh (not memoized) so new Date() is never stale
  const _rangeToday = new Date();
  _rangeToday.setHours(0, 0, 0, 0);
  const dateRange = Array.from({ length: maxDays }, (_, i) => {
    const d = addDays(_rangeToday, i);
    const dateStr = format(d, "yyyy-MM-dd");
    const dayName = format(d, "EEEE").toLowerCase();
    let isOff;
    if (isAny) {
      const anyWorking = allBarbers.some(b => {
        const dh = b.hours?.[dayName];
        return dh && !dh.off && !dh.closed;
      });
      isOff = allBarbers.length > 0 && !anyWorking;
    } else {
      const hasHours = barber?.hours && Object.keys(barber.hours).length > 0;
      const dayHours = barber?.hours?.[dayName];
      isOff = hasHours && (!dayHours || dayHours.off || dayHours.closed);
    }
    return { dateStr, dayLabel: format(d, "EEE"), dayNum: format(d, "d"), monthLabel: format(d, "MMM"), isOff };
  });

  // Clear selectedDate if it's in the past (e.g. after midnight or stale state)
  useEffect(() => {
    if (!selectedDate) return;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (selectedDate < todayStr) setSelectedDate(null);
  }, [selectedDate]);

  // Fetch bookings when date changes — all barbers for "any", single barber otherwise
  useEffect(() => {
    if (!selectedDate || !barber) return;
    setLoadingSlots(true);
    const mainQuery = isAny
      ? entities.Booking.filter({ date: selectedDate })
      : entities.Booking.filter({ barber_id: barber.id, date: selectedDate });

    if (guestBarber) {
      const guestIsAny = guestBarber.id === "any";
      const guestQuery = (guestIsAny || isAny)
        ? entities.Booking.filter({ date: selectedDate })
        : entities.Booking.filter({ barber_id: guestBarber.id, date: selectedDate });
      console.log("[DateTimeStep] fetching bookings — date:", selectedDate,
        "| main barber:", isAny ? "any" : barber.id,
        "| guest barber:", guestIsAny ? "any" : guestBarber.id,
        "| guestBarber.hours:", guestBarber.hours);
      Promise.all([mainQuery, guestQuery])
        .then(([main, guest]) => {
          console.log("[DateTimeStep] bookings fetched — main:", main.length, "guest:", guest.length);
          setBookings(main);
          setGuestBookings(guest);
        })
        .catch(console.error)
        .finally(() => setLoadingSlots(false));
    } else {
      mainQuery
        .then(bkgs => { setBookings(bkgs); setGuestBookings([]); })
        .catch(console.error)
        .finally(() => setLoadingSlots(false));
    }
  }, [selectedDate, barber, isAny, guestBarber?.id]);

  // Generate slots — union across all working barbers for "any"
  const slots = useMemo(() => {
    if (!selectedDate || !barber) return [];
    const dayName = format(new Date(selectedDate + "T12:00:00"), "EEEE").toLowerCase();
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const isSelectedToday = selectedDate === todayStr;
    const cutoffHHMM = isSelectedToday ? format(addMinutes(new Date(), minNotice), "HH:mm") : null;

    // Helper: check if the guest's slot is also free
    // "same_time"    → guest starts at the same time as the main client
    // "back_to_back" → guest starts immediately after the main appointment ends
    const guestDuration = guestService?.duration ?? 30;
    const checkGuestFree = (mainStartTime) => {
      if (!guestBarber || !guestService) return true;

      let guestTime;
      if (guestTiming === "same_time") {
        guestTime = mainStartTime;
      } else {
        const [sh, sm] = mainStartTime.split(":").map(Number);
        const guestStartMins = sh * 60 + sm + serviceDuration;
        const gH = Math.floor(guestStartMins / 60);
        const gM = guestStartMins % 60;
        guestTime = `${String(gH).padStart(2, "0")}:${String(gM).padStart(2, "0")}`;
      }

      if (guestBarber.id === "any") {
        const result = allBarbers.some(b => {
          const dh = b.hours?.[dayName];
          if (!dh || dh.off || dh.closed) return false;
          if (guestTime < (dh.start || "09:00") || guestTime >= (dh.end || "18:00")) return false;
          return !isSlotTaken(guestTime, guestDuration, guestBookings.filter(bk => bk.barber_id === b.id));
        });
        console.log("[guest-any] mainStart:", mainStartTime, "guestTime:", guestTime, "timing:", guestTiming, "free:", result);
        return result;
      }

      // Specific guest barber
      const guestHasHours = guestBarber.hours && Object.keys(guestBarber.hours).length > 0;
      console.log("[guest] barber:", guestBarber.name, "| dayName:", dayName,
        "| guestTime:", guestTime, "| timing:", guestTiming, "| hasHours:", guestHasHours,
        "| hours[day]:", guestBarber.hours?.[dayName],
        "| guestBookings:", guestBookings.length);

      if (!guestHasHours) {
        const taken = isSlotTaken(guestTime, guestDuration, guestBookings);
        console.log("[guest] no hours configured, isSlotTaken:", taken);
        return !taken;
      }

      const dh = guestBarber.hours[dayName];
      if (!dh || dh.off || dh.closed) {
        console.log("[guest] barber off/closed this day:", dh);
        return false;
      }
      if (guestTime < (dh.start || "09:00") || guestTime >= (dh.end || "18:00")) {
        console.log("[guest] guestTime", guestTime, "outside hours", dh.start, "-", dh.end);
        return false;
      }
      const taken = isSlotTaken(guestTime, guestDuration, guestBookings);
      console.log("[guest] isSlotTaken:", taken);
      return !taken;
    };

    if (isAny) {
      const timeSet = new Set();
      allBarbers.forEach(b => {
        const dh = b.hours?.[dayName];
        if (!dh || dh.off || dh.closed) return;
        generateSlots(dh.start || "09:00", dh.end || "18:00", 30).forEach(s => timeSet.add(s.time));
      });
      return Array.from(timeSet).sort().map(time => {
        const label = format(parse(time, "HH:mm", new Date()), "h:mm a");
        const isPast = cutoffHHMM !== null && time <= cutoffHHMM;
        const anyFree = !isPast && allBarbers.some(b => {
          const dh = b.hours?.[dayName];
          if (!dh || dh.off || dh.closed) return false;
          if (time < (dh.start || "09:00") || time >= (dh.end || "18:00")) return false;
          return !isSlotTaken(time, serviceDuration, bookings.filter(bk => bk.barber_id === b.id));
        }) && checkGuestFree(time);
        return { time, label, taken: !anyFree };
      });
    }

    const dayHours = barber.hours?.[dayName];
    if (!dayHours || dayHours.off || dayHours.closed) return [];
    return generateSlots(dayHours.start || "09:00", dayHours.end || "18:00", 30).map(slot => ({
      ...slot,
      taken: isSlotTaken(slot.time, serviceDuration, bookings) ||
             (cutoffHHMM !== null && slot.time <= cutoffHHMM) ||
             !checkGuestFree(slot.time),
    }));
  }, [selectedDate, barber, bookings, guestBookings, serviceDuration, allBarbers, isAny, minNotice, guestBarber, guestService, guestTiming]);

  return (
    <motion.div {...fadeSlide} className="min-h-screen" style={{ background: "#0A0A0A" }}>
      <StepHeader stepLabel="Step 3 of 5" title="Pick a Date & Time" onBack={onBack} progress={60} />

      <div className="px-6 py-6">
        {/* Date strip header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/40 text-xs uppercase tracking-widest font-semibold">Select a date</p>
          {(guestBarber && guestService) ? (
            <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "#1f2a1f", color: "#8B9A7E" }}>
              <Users className="w-3 h-3 inline mr-1" />{guestTiming === "same_time" ? "Same time slots" : "Back-to-back slots"}
            </span>
          ) : (
            <button
              onClick={handleNextAvailable}
              disabled={findingNext || loadingMore}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: findingNext ? "#2e3a2e" : "#1a2a1a",
                color: findingNext ? "#6B7A5E" : "#8B9A7E",
                border: "1px solid #2a3a2a",
              }}
              onMouseEnter={e => { if (!findingNext && !loadingMore) e.currentTarget.style.background = "#243424"; }}
              onMouseLeave={e => { if (!findingNext && !loadingMore) e.currentTarget.style.background = "#1a2a1a"; }}
            >
              {findingNext
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Searching…</>
                : <>⚡ Next Available</>}
            </button>
          )}
        </div>

        {/* Quick pick slot cards */}
        {nextSlots.length > 0 && (
          <div className="mb-5">
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: "#8B9A7E" }}>
              Quick Pick
            </p>
            <div className="space-y-2">
              {nextSlots.map((slot) => (
                <button
                  key={`${slot.dateStr}|${slot.time}`}
                  onClick={() => onSelect(slot.dateStr, slot.time)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all"
                  style={{ background: "#141414", borderColor: "#2a2a2a" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#8B9A7E"; e.currentTarget.style.background = "#1a1f1a"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.background = "#141414"; }}
                >
                  <div className="flex-shrink-0 text-center w-12">
                    <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#8B9A7E" }}>
                      {slot.dayLabel}
                    </p>
                    <p className="text-white text-lg font-bold leading-tight">{slot.dateLabel.split(" ")[1]}</p>
                    <p className="text-[10px] text-white/30">{slot.dateLabel.split(" ")[0]}</p>
                  </div>
                  <div className="w-px h-8 flex-shrink-0" style={{ background: "#2a2a2a" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{slot.timeLabel}</p>
                    <p className="text-white/40 text-xs mt-0.5">with {slot.barberName}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0 text-white/20" />
                </button>
              ))}
            </div>
            {!slotsExhausted ? (
              <button
                onClick={handleSeeMore}
                disabled={loadingMore}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 mt-1 text-xs font-medium transition-colors"
                style={{ color: loadingMore ? "#4a5a44" : "#8B9A7E" }}
              >
                {loadingMore ? <><Loader2 className="w-3 h-3 animate-spin" /> Loading…</> : "See more times →"}
              </button>
            ) : (
              <p className="text-white/20 text-xs text-center py-2">No more availability found.</p>
            )}
            <div className="h-px mt-4 mb-1" style={{ background: "#1a1a1a" }} />
          </div>
        )}

        {slotsExhausted && nextSlots.length === 0 && (
          <p className="text-white/30 text-xs text-center py-2 mb-2">
            No availability found in the next {maxDays} days.
          </p>
        )}

        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-3 -mx-6 px-6"
          style={{ scrollbarWidth: "none" }}
        >
          {dateRange.map(({ dateStr, dayLabel, dayNum, monthLabel, isOff }) => {
            const isSelected = selectedDate === dateStr;
            return (
              <button
                key={dateStr}
                disabled={isOff}
                onClick={() => setSelectedDate(dateStr)}
                className="flex-shrink-0 flex flex-col items-center w-14 py-3 rounded-xl border transition-all"
                style={{
                  background: isSelected ? "#8B9A7E" : "#141414",
                  borderColor: isSelected ? "#8B9A7E" : "#2a2a2a",
                  opacity: isOff ? 0.3 : 1,
                  cursor: isOff ? "not-allowed" : "pointer",
                }}
              >
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${isSelected ? "text-white" : "text-white/40"}`}>
                  {dayLabel}
                </span>
                <span className={`text-xl font-bold mt-0.5 ${isSelected ? "text-white" : "text-white"}`}>
                  {dayNum}
                </span>
                <span className={`text-[10px] ${isSelected ? "text-white/80" : "text-white/30"}`}>
                  {monthLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Time slots */}
        {selectedDate && (
          <div className="mt-8">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-3 font-semibold">Available times</p>
            {loadingSlots ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#8B9A7E" }} />
              </div>
            ) : slots.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-8">No availability on this day.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-w-xl mx-auto">
                {slots.map(({ time, label, taken }) => (
                  <button
                    key={time}
                    disabled={taken}
                    onClick={() => onSelect(selectedDate, time)}
                    className="py-3 rounded-xl border text-sm font-medium transition-all"
                    style={{
                      background: taken ? "#111" : "#141414",
                      borderColor: taken ? "#1a1a1a" : "#2a2a2a",
                      color: taken ? "#333" : "#fff",
                      cursor: taken ? "not-allowed" : "pointer",
                      textDecoration: taken ? "line-through" : "none",
                    }}
                    onMouseEnter={e => { if (!taken) { e.currentTarget.style.borderColor = "#8B9A7E"; e.currentTarget.style.background = "#1a1f1a"; } }}
                    onMouseLeave={e => { if (!taken) { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.background = "#141414"; } }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!selectedDate && nextSlots.length === 0 && (
          <p className="text-white/20 text-sm text-center mt-12">← Choose a date to see available times</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Client Info Step ─────────────────────────────────────────────────────────

function ClientInfoStep({ name, phone, email, onChange, onNext, onBack }) {
  const [error, setError] = useState("");

  const handleNext = () => {
    if (!name.trim()) { setError("Please enter your full name."); return; }
    setError("");
    onNext();
  };

  const inputStyle = {
    width: "100%",
    background: "#141414",
    border: "1px solid #2a2a2a",
    borderRadius: "12px",
    padding: "12px 16px",
    color: "#fff",
    fontSize: "15px",
    outline: "none",
  };

  return (
    <motion.div {...fadeSlide} className="min-h-screen" style={{ background: "#0A0A0A" }}>
      <StepHeader stepLabel="Step 4 of 5" title="Your Info" onBack={onBack} progress={80} />

      <div className="px-6 py-8 max-w-md mx-auto">
        <p className="text-white/40 text-sm mb-8">Almost there — just tell us who you are.</p>

        <div className="flex flex-col gap-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-widest font-semibold mb-2">
              Full Name <span style={{ color: "#8B9A7E" }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              placeholder="Jane Smith"
              onChange={e => onChange("name", e.target.value.replace(/\b\w/g, c => c.toUpperCase()))}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "#8B9A7E")}
              onBlur={e => (e.target.style.borderColor = "#2a2a2a")}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-widest font-semibold mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              placeholder="(555) 000-0000"
              onChange={e => onChange("phone", e.target.value)}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "#8B9A7E")}
              onBlur={e => (e.target.style.borderColor = "#2a2a2a")}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-widest font-semibold mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              placeholder="jane@example.com"
              onChange={e => onChange("email", e.target.value)}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "#8B9A7E")}
              onBlur={e => (e.target.style.borderColor = "#2a2a2a")}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>
          )}

          <button
            onClick={handleNext}
            className="w-full py-4 rounded-xl font-semibold text-white text-base mt-2 transition-all"
            style={{ background: "#8B9A7E" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#6B7A5E")}
            onMouseLeave={e => (e.currentTarget.style.background = "#8B9A7E")}
          >
            Review Booking
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Calendar helpers ─────────────────────────────────────────────────────────

function calendarDates(date, time, duration) {
  // Returns [startStr, endStr] in YYYYMMDDTHHmmss format (local, no Z)
  const startDt = new Date(`${date}T${time}:00`);
  const endDt   = addMinutes(startDt, duration);
  const fmt = (d) => format(d, "yyyyMMdd'T'HHmmss");
  return [fmt(startDt), fmt(endDt)];
}

function googleCalendarUrl({ title, startStr, endStr, location, details }) {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startStr}/${endStr}`,
    ...(location && { location }),
    ...(details  && { details  }),
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

function downloadIcs({ title, startStr, endStr, location, details, uid }) {
  const esc = (s = "") => s.replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Stand Tall Booking//EN",
    "BEGIN:VEVENT",
    `UID:${uid}@standtall`,
    `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss")}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${esc(title)}`,
    location ? `LOCATION:${esc(location)}` : null,
    details  ? `DESCRIPTION:${esc(details)}`  : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");

  const blob = new Blob([lines], { type: "text/calendar;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = "appointment.ics"; a.click();
  URL.revokeObjectURL(url);
}

// ─── Confirm Step ─────────────────────────────────────────────────────────────

function ConfirmStep({ barber, service, date, time, clientName, clientPhone, clientEmail, onConfirm, onBack, submitting, cancelPolicyEnabled, cancelPolicyText, guest = null }) {
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const duration = barber?.service_durations?.[service?.id] ?? service?.duration ?? 30;
  const endTimeHHMM = format(addMinutes(parse(time, "HH:mm", new Date()), duration), "HH:mm");
  const endTime = format(parse(endTimeHHMM, "HH:mm", new Date()), "h:mm a");
  const startLabel = format(parse(time, "HH:mm", new Date()), "h:mm a");
  const dateLabel = format(new Date(date + "T12:00:00"), "EEEE, MMMM d, yyyy");
  const showPolicy = cancelPolicyEnabled && cancelPolicyText;
  const confirmDisabled = submitting || (showPolicy && !policyAgreed);

  const guestDuration = guest?.service?.duration ?? 30;
  const guestStartHHMM = guest?.timing === "same_time" ? time : endTimeHHMM;
  const guestStartLabel = guest ? format(parse(guestStartHHMM, "HH:mm", new Date()), "h:mm a") : null;
  const guestEndLabel = guest ? format(addMinutes(parse(guestStartHHMM, "HH:mm", new Date()), guestDuration), "h:mm a") : null;
  const guestTimingLabel = guest?.timing === "same_time" ? "(same time)" : "(back-to-back)";

  const row = (icon, label, value) => (
    <div className="flex items-start gap-4 py-4 border-b border-white/5 last:border-0">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#1f2a1f" }}>
        {icon}
      </div>
      <div>
        <p className="text-white/40 text-xs uppercase tracking-widest font-semibold">{label}</p>
        <p className="text-white font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );

  return (
    <motion.div {...fadeSlide} className="min-h-screen" style={{ background: "#0A0A0A" }}>
      <StepHeader stepLabel="Step 5 of 5" title="Confirm Booking" onBack={onBack} progress={100} />

      <div className="px-6 py-8 max-w-md mx-auto">
        {guest && <p className="text-white/30 text-xs uppercase tracking-widest font-semibold mb-2">Your Appointment</p>}
        <div className="rounded-2xl border overflow-hidden mb-4" style={{ borderColor: "#2a2a2a", background: "#111" }}>
          {row(<Scissors className="w-4 h-4" style={{ color: "#8B9A7E" }} />, "Barber", barber?.id === "any" ? "First Available Barber" : barber?.name)}
          {row(<Tag className="w-4 h-4" style={{ color: "#8B9A7E" }} />, "Service", `${service?.name}${service?.price > 0 ? ` — $${Number(service.price).toFixed(0)}` : ""}`)}
          {row(<Calendar className="w-4 h-4" style={{ color: "#8B9A7E" }} />, "Date & Time", `${dateLabel} · ${startLabel} – ${endTime}`)}
          {row(<User className="w-4 h-4" style={{ color: "#8B9A7E" }} />, "Client", [clientName, clientPhone, clientEmail].filter(Boolean).join(" · "))}
        </div>

        {guest && (
          <>
            <p className="text-white/30 text-xs uppercase tracking-widest font-semibold mb-2 mt-4">Guest Appointment</p>
            <div className="rounded-2xl border overflow-hidden mb-4" style={{ borderColor: "#2a3a2a", background: "#0f1a0f" }}>
              {row(<User className="w-4 h-4" style={{ color: "#8B9A7E" }} />, "Guest", guest.name)}
              {row(<Scissors className="w-4 h-4" style={{ color: "#8B9A7E" }} />, "Service", `${guest.service?.name}${guest.service?.price > 0 ? ` — $${Number(guest.service.price).toFixed(0)}` : ""}`)}
              {row(<Users className="w-4 h-4" style={{ color: "#8B9A7E" }} />, "Barber", guest.barber?.id === "any" ? "First Available Barber" : guest.barber?.name)}
              {row(<Clock className="w-4 h-4" style={{ color: "#8B9A7E" }} />, "Time", `${guestStartLabel} – ${guestEndLabel} ${guestTimingLabel}`)}
            </div>
          </>
        )}

        {showPolicy && (
          <div className="rounded-xl border mb-4" style={{ borderColor: "#2a2a1a", background: "#141408" }}>
            <p className="text-[11px] font-bold uppercase tracking-widest px-4 pt-4 pb-2" style={{ color: "#c8a94e" }}>Cancellation Policy</p>
            <div className="px-4 pb-4 max-h-40 overflow-y-auto">
              <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap">{cancelPolicyText}</p>
            </div>
            <label className="flex items-center gap-3 px-4 py-3 border-t cursor-pointer" style={{ borderColor: "#2a2a1a" }}>
              <input
                type="checkbox"
                checked={policyAgreed}
                onChange={e => setPolicyAgreed(e.target.checked)}
                className="w-4 h-4 rounded accent-[#8B9A7E] flex-shrink-0"
              />
              <span className="text-white/70 text-sm">I agree to the cancellation policy</span>
            </label>
          </div>
        )}

        <button
          onClick={onConfirm}
          disabled={confirmDisabled}
          className="w-full py-4 rounded-xl font-semibold text-white text-base transition-all flex items-center justify-center gap-2"
          style={{
            background: confirmDisabled ? "#2e3a2e" : "#8B9A7E",
            cursor: confirmDisabled ? "not-allowed" : "pointer",
            opacity: confirmDisabled && !submitting ? 0.5 : 1,
          }}
          onMouseEnter={e => { if (!confirmDisabled) e.currentTarget.style.background = "#6B7A5E"; }}
          onMouseLeave={e => { if (!confirmDisabled) e.currentTarget.style.background = "#8B9A7E"; }}
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? "Booking…" : "Confirm Booking"}
        </button>

        {!showPolicy && (
          <p className="text-white/20 text-xs text-center mt-4">
            By confirming you agree to our cancellation policy.
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Success Screen ────────────────────────────────────────────────────────────

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={handleCopy} className="ml-2 text-white/30 hover:text-white transition-colors flex-shrink-0" title="Copy">
      {copied ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#8B9A7E" }} /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function SuccessStep({ barber, service, date, time, clientName, shopAddress, shopPhone, showShopPhone, shopEmail, showShopEmail, onReset, guest = null }) {
  const dateLabel = format(new Date(date + "T12:00:00"), "EEEE, MMMM d");
  const timeLabel = format(parse(time, "HH:mm", new Date()), "h:mm a");

  const duration    = barber?.service_durations?.[service?.id] ?? service?.duration ?? 30;
  const title       = `${service?.name} with ${barber?.name}`;
  const details     = `Booked via Stand Tall Barbershop`;
  const [startStr, endStr] = calendarDates(date, time, duration);
  const calArgs     = { title, startStr, endStr, location: shopAddress, details, uid: `${date}-${time}-${barber?.id}` };

  const guestDuration = guest?.service?.duration ?? 30;
  const guestStartHHMM = guest?.timing === "same_time"
    ? time
    : format(addMinutes(parse(time, "HH:mm", new Date()), duration), "HH:mm");
  const guestTimeLabel = guest ? format(parse(guestStartHHMM, "HH:mm", new Date()), "h:mm a") : null;

  return (
    <motion.div {...fadeSlide} className="flex flex-col items-center justify-center min-h-screen px-6 text-center" style={{ background: "#0A0A0A" }}>
      <div className="mb-6" style={{ color: "#8B9A7E" }}>
        <CheckCircle2 className="w-20 h-20 mx-auto" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">You're booked!</h1>
      <p className="text-white/50 mb-8 max-w-xs">
        {guest
          ? `See you ${dateLabel} at ${timeLabel} — both appointments confirmed.`
          : `See you ${dateLabel} at ${timeLabel} with ${barber?.name}.`}
      </p>

      <div className="rounded-2xl border w-full max-w-sm text-left overflow-hidden mb-4" style={{ borderColor: "#2a2a2a", background: "#111" }}>
        <div className="px-5 py-4 border-b border-white/5">
          <p className="text-white/40 text-xs uppercase tracking-widest font-semibold">{guest ? "Your Appointment" : "Booking Summary"}</p>
        </div>
        {[
          ["Client", clientName],
          ["Barber", barber?.name],
          ["Service", service?.name],
          ["Date", dateLabel],
          ["Time", timeLabel],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between items-center px-5 py-3 border-b border-white/5 last:border-0">
            <span className="text-white/40 text-sm">{label}</span>
            <span className="text-white text-sm font-medium">{value}</span>
          </div>
        ))}
      </div>

      {guest && (
        <div className="rounded-2xl border w-full max-w-sm text-left overflow-hidden mb-4" style={{ borderColor: "#2a3a2a", background: "#0f1a0f" }}>
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#8B9A7E" }}>Guest Appointment</p>
          </div>
          {[
            ["Guest", guest.name],
            ["Barber", guest.resolvedBarber?.name ?? (guest.barber?.id === "any" ? "First Available" : guest.barber?.name)],
            ["Service", guest.service?.name],
            ["Date", dateLabel],
            ["Time", guestTimeLabel],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-center px-5 py-3 border-b border-white/5 last:border-0">
              <span className="text-white/40 text-sm">{label}</span>
              <span className="text-white text-sm font-medium">{value}</span>
            </div>
          ))}
        </div>
      )}

      {(shopAddress || (showShopPhone && shopPhone) || (showShopEmail && shopEmail)) && (
        <div className="rounded-2xl border w-full max-w-sm text-left overflow-hidden mb-8" style={{ borderColor: "#2a2a2a", background: "#111" }}>
          <div className="px-5 py-4 border-b border-white/5">
            <p className="text-white/40 text-xs uppercase tracking-widest font-semibold">Shop Location & Contact</p>
          </div>
          {shopAddress && (
            <div className="flex justify-between items-center px-5 py-3 border-b border-white/5">
              <span className="text-white/40 text-sm">Address</span>
              <div className="flex items-center">
                <span className="text-white text-sm font-medium text-right max-w-[180px]">{shopAddress}</span>
                <CopyButton text={shopAddress} />
              </div>
            </div>
          )}
          {showShopPhone && shopPhone && (
            <div className="flex justify-between items-center px-5 py-3 border-b border-white/5 last:border-0">
              <span className="text-white/40 text-sm">Phone</span>
              <div className="flex items-center">
                <span className="text-white text-sm font-medium">{shopPhone}</span>
                <CopyButton text={shopPhone} />
              </div>
            </div>
          )}
          {showShopEmail && shopEmail && (
            <div className="flex justify-between items-center px-5 py-3">
              <span className="text-white/40 text-sm">Email</span>
              <div className="flex items-center">
                <span className="text-white text-sm font-medium">{shopEmail}</span>
                <CopyButton text={shopEmail} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calendar buttons */}
      <div className="flex flex-col gap-2 w-full max-w-sm mb-4">
        <a
          href={googleCalendarUrl(calArgs)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all"
          style={{ background: "#141414", border: "1px solid #2a2a2a", color: "#fff" }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "#8B9A7E")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "#2a2a2a")}
        >
          <Calendar className="w-4 h-4" style={{ color: "#8B9A7E" }} />
          Add to Google Calendar
        </a>
        <button
          onClick={() => downloadIcs(calArgs)}
          className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all"
          style={{ background: "#141414", border: "1px solid #2a2a2a", color: "#fff" }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "#8B9A7E")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "#2a2a2a")}
        >
          <Calendar className="w-4 h-4" style={{ color: "#B0BFA4" }} />
          Add to Apple Calendar
        </button>
      </div>

      <button
        onClick={onReset}
        className="px-8 py-3 rounded-xl font-semibold text-sm transition-all"
        style={{ background: "#141414", border: "1px solid #2a2a2a", color: "#fff" }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "#8B9A7E")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "#2a2a2a")}
      >
        Book Another Appointment
      </button>
    </motion.div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function ClientBooking() {
  const [step, setStep] = useState(0);
  const [barbers, setBarbers] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [shopSettings, setShopSettings] = useState({});
  const [loading, setLoading] = useState(true);

  // My Appointments sub-flow: null | "phone" | "otp" | "list"
  const [myAppts, setMyAppts]             = useState(null);
  const [myApptPhone, setMyApptPhone]     = useState("");
  const [myApptClient, setMyApptClient]   = useState(null);
  const [myApptBookings, setMyApptBookings] = useState([]);

  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [hasGuest, setHasGuest] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestService, setGuestService] = useState(null);
  const [guestBarber, setGuestBarber] = useState(null);
  const [guestTiming, setGuestTiming] = useState("back_to_back"); // "back_to_back" | "same_time"
  const [resolvedGuestBarber, setResolvedGuestBarber] = useState(null);

  useEffect(() => {
    Promise.all([entities.Barber.list(), entities.Service.list(), entities.ShopSettings.list()])
      .then(([allBarbers, svcs, settingsArr]) => {
        setBarbers(allBarbers.filter((b) => b.is_active !== false && b.online_bookable !== false));
        setAllServices(svcs.filter((s) => s.is_active !== false));
        setShopSettings(settingsArr[0] || {});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Services available for the selected barber
  const availableServices = useMemo(() => {
    if (!selectedBarber || selectedBarber.id === "any") return allServices;
    const ids = selectedBarber.available_services;
    if (!ids || ids.length === 0) return allServices;
    return allServices.filter((s) => ids.includes(s.id));
  }, [selectedBarber, allServices]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      // Find or create client
      let clientId = null;
      if (clientPhone || clientEmail) {
        const all = await entities.Client.list();
        const existing = all.find(c =>
          (clientPhone && (c.phone || "").replace(/\D/g, "") === clientPhone.replace(/\D/g, "")) ||
          (clientEmail && c.email?.toLowerCase() === clientEmail.toLowerCase())
        );
        if (existing) {
          clientId = existing.id;
        } else {
          const created = await entities.Client.create({ name: clientName, phone: clientPhone, email: clientEmail });
          clientId = created.id;
        }
      }

      const duration = selectedBarber?.service_durations?.[selectedService?.id] ?? selectedService?.duration ?? 30;
      const endTime = format(addMinutes(parse(selectedTime, "HH:mm", new Date()), duration), "HH:mm");

      // Resolve "any barber" to whichever barber actually has the slot free
      let bookingBarber = selectedBarber;
      if (selectedBarber.id === "any") {
        const dayName = format(new Date(selectedDate + "T12:00:00"), "EEEE").toLowerCase();
        const dayBookings = await entities.Booking.filter({ date: selectedDate });
        bookingBarber = barbers.find(b => {
          const dh = b.hours?.[dayName];
          if (!dh || dh.off || dh.closed) return false;
          if (selectedTime < (dh.start || "09:00") || selectedTime >= (dh.end || "18:00")) return false;
          return !isSlotTaken(selectedTime, duration, dayBookings.filter(bk => bk.barber_id === b.id));
        });
        if (!bookingBarber) throw new Error("No barber available at that time — please choose another slot.");
        setSelectedBarber(bookingBarber);
      }

      await entities.Booking.create({
        barber_id: bookingBarber.id,
        barber_name: bookingBarber.name,
        service_id: selectedService.id,
        service_name: selectedService.name,
        client_id: clientId,
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail,
        date: selectedDate,
        start_time: selectedTime,
        end_time: endTime,
        duration,
        price: selectedService.price ?? 0,
        final_price: selectedService.price ?? 0,
        status: "scheduled",
        visit_type: "online",
      });

      // Guest booking
      let bookingGuestBarber = null;
      let guestStartHHMM = null;
      let guestEndHHMM = null;
      if (hasGuest && guestService && guestBarber) {
        // "same_time" → guest starts at the same time; "back_to_back" → guest starts after main ends
        guestStartHHMM = guestTiming === "same_time" ? selectedTime : endTime;
        const guestDuration = guestService.duration ?? 30;
        guestEndHHMM = format(addMinutes(parse(guestStartHHMM, "HH:mm", new Date()), guestDuration), "HH:mm");

        bookingGuestBarber = guestBarber;
        if (guestBarber.id === "any") {
          const dayName = format(new Date(selectedDate + "T12:00:00"), "EEEE").toLowerCase();
          const dayBookings = await entities.Booking.filter({ date: selectedDate });
          bookingGuestBarber = barbers.find(b => {
            // For same_time, avoid assigning the same barber as the main client
            if (guestTiming === "same_time" && b.id === bookingBarber.id) return false;
            const dh = b.hours?.[dayName];
            if (!dh || dh.off || dh.closed) return false;
            if (guestStartHHMM < (dh.start || "09:00") || guestStartHHMM >= (dh.end || "18:00")) return false;
            return !isSlotTaken(guestStartHHMM, guestDuration, dayBookings.filter(bk => bk.barber_id === b.id));
          });
          if (!bookingGuestBarber) throw new Error("No barber available for guest — please choose another slot.");
        }
        setResolvedGuestBarber(bookingGuestBarber);

        await entities.Booking.create({
          barber_id: bookingGuestBarber.id,
          barber_name: bookingGuestBarber.name,
          service_id: guestService.id,
          service_name: guestService.name,
          client_name: guestName,
          date: selectedDate,
          start_time: guestStartHHMM,
          end_time: guestEndHHMM,
          duration: guestDuration,
          price: guestService.price ?? 0,
          final_price: guestService.price ?? 0,
          status: "scheduled",
          visit_type: "online",
        });
      }

      if (clientEmail) {
        const emailBody = {
          client_name: clientName,
          client_email: clientEmail,
          barber_name: bookingBarber.name,
          service_name: selectedService.name,
          date: selectedDate,
          start_time: selectedTime,
          end_time: endTime,
          shop_name: shopName || undefined,
          shop_address: shopAddress || undefined,
          shop_phone: shopPhone || undefined,
        };
        if (hasGuest && guestService && bookingGuestBarber) {
          emailBody.guest_name = guestName;
          emailBody.guest_barber_name = bookingGuestBarber.name;
          emailBody.guest_service_name = guestService.name;
          emailBody.guest_start_time = guestStartHHMM;
          emailBody.guest_end_time = guestEndHHMM;
        }
        supabase.functions.invoke("sendBookingConfirmation", { body: emailBody })
          .then(({ error }) => {
            if (error) console.warn("[sendBookingConfirmation] invoke error:", error);
          });
      }

      setStep(8);
    } catch (err) {
      console.error("Booking failed — message:", err?.message, "| details:", err?.details, "| hint:", err?.hint, "| code:", err?.code);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(0);
    setSelectedBarber(null);
    setSelectedService(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setClientName("");
    setClientPhone("");
    setClientEmail("");
    setHasGuest(false);
    setGuestName("");
    setGuestService(null);
    setGuestBarber(null);
    setGuestTiming("back_to_back");
    setResolvedGuestBarber(null);
  };

  const logoUrl       = shopSettings.booking_logo_url || null;
  const shopName      = shopSettings.shop_name      || "";
  const shopAddress   = shopSettings.shop_address   || "";
  const shopPhone     = shopSettings.shop_phone     || "";
  const showShopPhone = shopSettings.show_shop_phone !== false;
  const shopEmail     = shopSettings.shop_email     || "";
  const showShopEmail = shopSettings.show_shop_email !== false;
  const socialLinks           = parseSocialLinks(shopSettings.social_links);
  const maxDays               = shopSettings.max_booking_days_ahead || 60;
  const minBookingNotice      = shopSettings.min_booking_notice_minutes ?? 0;
  const cancelPolicyEnabled   = shopSettings.cancellation_policy_enabled === true;
  const cancelPolicyText      = shopSettings.cancellation_policy_text || "";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A" }}>
        <div className="flex flex-col items-center gap-4">
          <img src={logoUrl || LOGO_URL} alt="" className="w-16 h-16 rounded-xl opacity-80 object-cover" />
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#8B9A7E" }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <AnimatePresence mode="wait">
        {myAppts === "phone" && (
          <PhoneEntryScreen
            key="appt-phone"
            onBack={() => setMyAppts(null)}
            onSent={(phone) => { setMyApptPhone(phone); setMyAppts("otp"); }}
          />
        )}
        {myAppts === "otp" && (
          <OtpEntryScreen
            key="appt-otp"
            phone={myApptPhone}
            onBack={() => setMyAppts("phone")}
            onVerified={(client, bookings) => { setMyApptClient(client); setMyApptBookings(bookings); setMyAppts("list"); }}
          />
        )}
        {myAppts === "list" && (
          <AppointmentsScreen
            key="appt-list"
            client={myApptClient}
            bookings={myApptBookings}
            onBack={() => setMyAppts(null)}
          />
        )}
        {!myAppts && step === 0 && (
          <WelcomeStep key="welcome" onStart={() => setStep(1)} onViewAppointments={() => setMyAppts("phone")}
            shopName={shopName} logoUrl={logoUrl}
            shopAddress={shopAddress} shopPhone={shopPhone} showShopPhone={showShopPhone}
            shopEmail={shopEmail} showShopEmail={showShopEmail} socialLinks={socialLinks} />
        )}
        {step === 1 && (
          <BarberStep
            key="barber"
            barbers={barbers}
            onSelect={(barber) => { setSelectedBarber(barber); setSelectedService(null); setStep(2); }}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <ServiceStep
            key="service"
            services={availableServices}
            barber={selectedBarber}
            onSelect={(svc) => { setSelectedService(svc); setSelectedDate(null); setSelectedTime(null); setStep(3); }}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <GuestPromptStep
            key="guest-prompt"
            onYes={() => setStep(4)}
            onNo={() => { setHasGuest(false); setGuestName(""); setGuestService(null); setGuestBarber(null); setStep(5); }}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <GuestFormStep
            key="guest-form"
            allServices={allServices}
            allBarbers={barbers}
            guestName={guestName}
            guestService={guestService}
            guestBarber={guestBarber}
            guestTiming={guestTiming}
            onNameChange={setGuestName}
            onServiceChange={setGuestService}
            onBarberChange={setGuestBarber}
            onTimingChange={setGuestTiming}
            onNext={() => { setHasGuest(true); setStep(5); }}
            onBack={() => setStep(3)}
          />
        )}
        {step === 5 && (
          <DateTimeStep
            key="datetime"
            barber={selectedBarber}
            service={selectedService}
            maxDays={maxDays}
            minNotice={minBookingNotice}
            allBarbers={barbers}
            guestService={hasGuest ? guestService : null}
            guestBarber={hasGuest ? guestBarber : null}
            guestTiming={hasGuest ? guestTiming : "back_to_back"}
            onSelect={(date, time) => { setSelectedDate(date); setSelectedTime(time); setStep(6); }}
            onBack={() => hasGuest ? setStep(4) : setStep(3)}
          />
        )}
        {step === 6 && (
          <ClientInfoStep
            key="info"
            name={clientName}
            phone={clientPhone}
            email={clientEmail}
            onChange={(field, val) => {
              if (field === "name") setClientName(val);
              if (field === "phone") setClientPhone(val);
              if (field === "email") setClientEmail(val);
            }}
            onNext={() => setStep(7)}
            onBack={() => setStep(5)}
          />
        )}
        {step === 7 && (
          <ConfirmStep
            key="confirm"
            barber={selectedBarber}
            service={selectedService}
            date={selectedDate}
            time={selectedTime}
            clientName={clientName}
            clientPhone={clientPhone}
            clientEmail={clientEmail}
            onConfirm={handleConfirm}
            onBack={() => setStep(6)}
            submitting={submitting}
            cancelPolicyEnabled={cancelPolicyEnabled}
            cancelPolicyText={cancelPolicyText}
            guest={hasGuest ? { name: guestName, service: guestService, barber: guestBarber, timing: guestTiming } : null}
          />
        )}
        {step === 8 && (
          <SuccessStep
            key="success"
            barber={selectedBarber}
            service={selectedService}
            date={selectedDate}
            time={selectedTime}
            clientName={clientName}
            shopAddress={shopAddress}
            shopPhone={shopPhone}
            showShopPhone={showShopPhone}
            shopEmail={shopEmail}
            showShopEmail={showShopEmail}
            onReset={handleReset}
            guest={hasGuest ? { name: guestName, service: guestService, barber: guestBarber, resolvedBarber: resolvedGuestBarber, timing: guestTiming } : null}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
