import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import ClientIdentification from "../components/booking/ClientIdentification";
import BarberSelection from "../components/booking/BarberSelection";
import DateAndTimeSelection from "../components/booking/DateAndTimeSelection";
import AppointmentBooking from "../components/booking/AppointmentBooking";
import BookingConfirmation from "../components/booking/BookingConfirmation";

export default function PublicBooking() {
  const [step, setStep] = useState("identify"); // identify, barber, dateTime, service, confirmation
  const [client, setClient] = useState(null);
  const [barber, setBarber] = useState(null);
  const [dateTime, setDateTime] = useState(null);
  const [booking, setBooking] = useState(null);

  const { data: shopSettings = [] } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => base44.entities.ShopSettings.list(),
  });

  const handleIdentifySuccess = (foundClient) => {
    setClient(foundClient);
    setStep("barber");
  };

  const handleBackToIdentify = () => {
    setClient(null);
    setBarber(null);
    setDateTime(null);
    setStep("identify");
  };

  const handleBarberSuccess = (selectedBarber) => {
    setBarber(selectedBarber);
    setStep("dateTime");
  };

  const handleBackToBarber = () => {
    setBarber(null);
    setDateTime(null);
    setStep("barber");
  };

  const handleDateTimeSuccess = (selectedDateTime) => {
    setDateTime(selectedDateTime);
    setStep("service");
  };

  const handleBackToDateTime = () => {
    setDateTime(null);
    setStep("dateTime");
  };

  const handleBookingSuccess = (bookingData) => {
    setBooking(bookingData);
    setStep("confirmation");
  };

  const handleBackToService = () => {
    setStep("service");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAFAF8] to-[#F5F3EE] p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Logo/Header */}
        <div className="text-center py-6">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6993eba91209ee0a1089f355/fd9cfe023_6f5fd5cc-8fc9-4041-9d87-c24e77a3bc58.png"
            alt="Stand Tall Barbershop"
            className="w-24 h-24 rounded-lg mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-[#0A0A0A]">Book Your Appointment</h1>
          <p className="text-gray-500 mt-1">Stand Tall Barbershop</p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center gap-2 mb-6">
          <div className={`h-2 w-12 rounded-full ${["identify", "barber", "dateTime", "service"].includes(step) ? "bg-[#C9A94E]" : "bg-gray-200"}`} />
          <div className={`h-2 w-12 rounded-full ${["barber", "dateTime", "service"].includes(step) ? "bg-[#C9A94E]" : "bg-gray-200"}`} />
          <div className={`h-2 w-12 rounded-full ${["dateTime", "service"].includes(step) ? "bg-[#C9A94E]" : "bg-gray-200"}`} />
          <div className={`h-2 w-12 rounded-full ${step === "confirmation" ? "bg-[#C9A94E]" : "bg-gray-200"}`} />
        </div>

        {/* Content */}
        {step === "identify" && (
          <ClientIdentification onSuccess={handleIdentifySuccess} />
        )}

        {step === "barber" && client && (
          <BarberSelection 
            client={client}
            onSuccess={handleBarberSuccess}
            onBack={handleBackToIdentify}
          />
        )}

        {step === "dateTime" && client && barber && (
          <DateAndTimeSelection 
            client={client}
            barber={barber}
            onSuccess={handleDateTimeSuccess}
            onBack={handleBackToBarber}
          />
        )}

        {step === "service" && client && barber && dateTime && (
          <AppointmentBooking 
            client={client}
            barber={barber}
            dateTime={dateTime}
            onSuccess={handleBookingSuccess}
            onBack={handleBackToDateTime}
          />
        )}

        {step === "confirmation" && booking && client && (
          <BookingConfirmation 
            booking={booking}
            client={client}
            shopSettings={shopSettings[0]}
          />
        )}
      </div>
    </div>
  );
}