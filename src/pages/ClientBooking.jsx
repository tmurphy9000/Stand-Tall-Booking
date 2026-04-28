import React, { useState, useEffect } from "react";
import { entities } from "@/api/entities";
import { Loader2, Scissors, ChevronRight, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const LOGO_URL =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6993eba91209ee0a1089f355/fd9cfe023_6f5fd5cc-8fc9-4041-9d87-c24e77a3bc58.png";

const fadeSlide = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.22, ease: "easeOut" },
};

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
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-4 px-6 py-4 border-b border-white/10" style={{ background: "#0A0A0A" }}>
        <button
          onClick={onBack}
          className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">Step 1 of 5</p>
          <h2 className="text-white font-bold text-lg leading-tight">Choose Your Barber</h2>
        </div>
        <img src={LOGO_URL} alt="" className="w-8 h-8 rounded-lg ml-auto opacity-60" />
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-white/10">
        <div className="h-full bg-[#8B9A7E] transition-all duration-500" style={{ width: "20%" }} />
      </div>

      {/* Barber grid */}
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
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "#8B9A7E";
                e.currentTarget.style.background = "#1a1f1a";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.background = "#141414";
              }}
            >
              {/* Avatar */}
              <div
                className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                style={{ background: "#1f2a1f" }}
              >
                {barber.photo_url ? (
                  <img src={barber.photo_url} alt={barber.name} className="w-full h-full object-cover" />
                ) : (
                  <Scissors className="w-7 h-7" style={{ color: "#8B9A7E" }} />
                )}
              </div>

              {/* Info */}
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

// ─── Root Component ───────────────────────────────────────────────────────────

export default function ClientBooking() {
  const [step, setStep] = useState(0);
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBarber, setSelectedBarber] = useState(null);

  useEffect(() => {
    entities.Barber.list()
      .then((all) =>
        setBarbers(all.filter((b) => b.is_active !== false && b.online_bookable !== false))
      )
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
            onSelect={(barber) => {
              setSelectedBarber(barber);
              // Next steps will be wired up here
              console.log("Selected barber:", barber.name);
            }}
            onBack={() => setStep(0)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
