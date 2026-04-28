import React, { useState, useEffect, useMemo, useRef } from "react";
import { entities } from "@/api/entities";
import { Loader2, Scissors, ChevronRight, ArrowLeft, Clock, CheckCircle2, User, Calendar, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, parse, addMinutes } from "date-fns";

const LOGO_URL =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6993eba91209ee0a1089f355/fd9cfe023_6f5fd5cc-8fc9-4041-9d87-c24e77a3bc58.png";

const fadeSlide = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.22, ease: "easeOut" },
};

function StepHeader({ stepLabel, title, onBack, progress }) {
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
        <img src={LOGO_URL} alt="" className="w-8 h-8 rounded-lg ml-auto opacity-60" />
      </div>
      <div className="h-0.5 bg-white/10">
        <div className="h-full bg-[#8B9A7E] transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
    </>
  );
}

// ─── Welcome Step ─────────────────────────────────────────────────────────────

function WelcomeStep({ onStart }) {
  return (
    <motion.div {...fadeSlide} className="flex flex-col items-center justify-center min-h-screen px-6 text-center" style={{ background: "#0A0A0A" }}>
      <img src={LOGO_URL} alt="Stand Tall" className="w-28 h-28 rounded-2xl shadow-2xl mb-8" />
      <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Stand Tall Barbershop</h1>
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

function DateTimeStep({ barber, service, onSelect, onBack }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const scrollRef = useRef(null);

  const serviceDuration = barber?.service_durations?.[service?.id] ?? service?.duration ?? 30;

  // Build 14-day range, marking days the barber is off
  const dateRange = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const d = addDays(today, i);
      const dateStr = format(d, "yyyy-MM-dd");
      const dayName = format(d, "EEEE").toLowerCase();
      const dayHours = barber?.hours?.[dayName];
      const hasHours = barber?.hours && Object.keys(barber.hours).length > 0;
      const isOff = hasHours && (!dayHours || dayHours.off || dayHours.closed);
      return {
        dateStr,
        dayLabel: format(d, "EEE"),
        dayNum: format(d, "d"),
        monthLabel: format(d, "MMM"),
        isOff,
      };
    });
  }, [barber]);

  // Fetch bookings whenever the selected date changes
  useEffect(() => {
    if (!selectedDate || !barber) return;
    setLoadingSlots(true);
    entities.Booking.filter({ barber_id: barber.id, date: selectedDate })
      .then(setBookings)
      .catch(console.error)
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, barber]);

  // Generate available slots for the selected date
  const slots = useMemo(() => {
    if (!selectedDate || !barber) return [];
    const dayName = format(new Date(selectedDate + "T12:00:00"), "EEEE").toLowerCase();
    const dayHours = barber.hours?.[dayName];
    if (!dayHours || dayHours.off || dayHours.closed) return [];
    const start = dayHours.start || "09:00";
    const end = dayHours.end || "18:00";
    return generateSlots(start, end, 30).map((slot) => ({
      ...slot,
      taken: isSlotTaken(slot.time, serviceDuration, bookings),
    }));
  }, [selectedDate, barber, bookings, serviceDuration]);

  return (
    <motion.div {...fadeSlide} className="min-h-screen" style={{ background: "#0A0A0A" }}>
      <StepHeader stepLabel="Step 3 of 5" title="Pick a Date & Time" onBack={onBack} progress={60} />

      <div className="px-6 py-6">
        {/* Date strip */}
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3 font-semibold">Select a date</p>
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

        {!selectedDate && (
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

// ─── Confirm Step ─────────────────────────────────────────────────────────────

function ConfirmStep({ barber, service, date, time, clientName, clientPhone, clientEmail, onConfirm, onBack, submitting }) {
  const duration = barber?.service_durations?.[service?.id] ?? service?.duration ?? 30;
  const endTime = format(addMinutes(parse(time, "HH:mm", new Date()), duration), "h:mm a");
  const startLabel = format(parse(time, "HH:mm", new Date()), "h:mm a");
  const dateLabel = format(new Date(date + "T12:00:00"), "EEEE, MMMM d, yyyy");

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
        <div className="rounded-2xl border overflow-hidden mb-6" style={{ borderColor: "#2a2a2a", background: "#111" }}>
          {row(<Scissors className="w-4 h-4" style={{ color: "#8B9A7E" }} />, "Barber", barber?.name)}
          {row(<Tag className="w-4 h-4" style={{ color: "#8B9A7E" }} />, "Service", `${service?.name}${service?.price > 0 ? ` — $${Number(service.price).toFixed(0)}` : ""}`)}
          {row(<Calendar className="w-4 h-4" style={{ color: "#8B9A7E" }} />, "Date & Time", `${dateLabel} · ${startLabel} – ${endTime}`)}
          {row(<User className="w-4 h-4" style={{ color: "#8B9A7E" }} />, "Client", [clientName, clientPhone, clientEmail].filter(Boolean).join(" · "))}
        </div>

        <button
          onClick={onConfirm}
          disabled={submitting}
          className="w-full py-4 rounded-xl font-semibold text-white text-base transition-all flex items-center justify-center gap-2"
          style={{ background: submitting ? "#4a5a44" : "#8B9A7E", cursor: submitting ? "not-allowed" : "pointer" }}
          onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = "#6B7A5E"; }}
          onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = "#8B9A7E"; }}
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? "Booking…" : "Confirm Booking"}
        </button>

        <p className="text-white/20 text-xs text-center mt-4">
          By confirming you agree to our cancellation policy.
        </p>
      </div>
    </motion.div>
  );
}

// ─── Success Screen ────────────────────────────────────────────────────────────

function SuccessStep({ barber, service, date, time, clientName, onReset }) {
  const dateLabel = format(new Date(date + "T12:00:00"), "EEEE, MMMM d");
  const timeLabel = format(parse(time, "HH:mm", new Date()), "h:mm a");

  return (
    <motion.div {...fadeSlide} className="flex flex-col items-center justify-center min-h-screen px-6 text-center" style={{ background: "#0A0A0A" }}>
      <div className="mb-6" style={{ color: "#8B9A7E" }}>
        <CheckCircle2 className="w-20 h-20 mx-auto" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">You're booked!</h1>
      <p className="text-white/50 mb-8 max-w-xs">
        See you {dateLabel} at {timeLabel} with {barber?.name}.
      </p>

      <div className="rounded-2xl border w-full max-w-sm text-left overflow-hidden mb-8" style={{ borderColor: "#2a2a2a", background: "#111" }}>
        <div className="px-5 py-4 border-b border-white/5">
          <p className="text-white/40 text-xs uppercase tracking-widest font-semibold">Booking Summary</p>
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
  const [loading, setLoading] = useState(true);

  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([entities.Barber.list(), entities.Service.list()])
      .then(([allBarbers, svcs]) => {
        setBarbers(allBarbers.filter((b) => b.is_active !== false && b.online_bookable !== false));
        setAllServices(svcs.filter((s) => s.is_active !== false));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Services available for the selected barber
  const availableServices = useMemo(() => {
    if (!selectedBarber) return allServices;
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

      await entities.Booking.create({
        barber_id: selectedBarber.id,
        barber_name: selectedBarber.name,
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
        source: "online",
      });

      setStep(6);
    } catch (err) {
      console.error("Booking failed:", err);
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
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A" }}>
        <div className="flex flex-col items-center gap-4">
          <img src={LOGO_URL} alt="Stand Tall" className="w-16 h-16 rounded-xl opacity-80" />
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#8B9A7E" }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <AnimatePresence mode="wait">
        {step === 0 && (
          <WelcomeStep key="welcome" onStart={() => setStep(1)} />
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
          <DateTimeStep
            key="datetime"
            barber={selectedBarber}
            service={selectedService}
            onSelect={(date, time) => { setSelectedDate(date); setSelectedTime(time); setStep(4); }}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
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
            onNext={() => setStep(5)}
            onBack={() => setStep(3)}
          />
        )}
        {step === 5 && (
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
            onBack={() => setStep(4)}
            submitting={submitting}
          />
        )}
        {step === 6 && (
          <SuccessStep
            key="success"
            barber={selectedBarber}
            service={selectedService}
            date={selectedDate}
            time={selectedTime}
            clientName={clientName}
            onReset={handleReset}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
