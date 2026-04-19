import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import ClientIdentification from "../components/booking/ClientIdentification";
import AppointmentBooking from "../components/booking/AppointmentBooking";
import BookingConfirmation from "../components/booking/BookingConfirmation";

export default function PublicBooking() {
  const [step, setStep] = useState("identify"); // identify, booking, confirmation
  const [client, setClient] = useState(null);
  const [booking, setBooking] = useState(null);

  const { data: shopSettings = [] } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => base44.entities.ShopSettings.list(),
  });

  const handleIdentifySuccess = (foundClient) => {
    setClient(foundClient);
    setStep("booking");
  };

  const handleBackToIdentify = () => {
    setClient(null);
    setStep("identify");
  };

  const handleBookingSuccess = (bookingData) => {
    setBooking(bookingData);
    setStep("confirmation");
  };

  const handleBackToBooking = () => {
    setStep("booking");
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
          <div className={`h-2 w-12 rounded-full ${step === "identify" ? "bg-[#C9A94E]" : "bg-gray-200"}`} />
          <div className={`h-2 w-12 rounded-full ${step === "booking" ? "bg-[#C9A94E]" : "bg-gray-200"}`} />
          <div className={`h-2 w-12 rounded-full ${step === "confirmation" ? "bg-[#C9A94E]" : "bg-gray-200"}`} />
        </div>

        {/* Content */}
        {step === "identify" && (
          <ClientIdentification onSuccess={handleIdentifySuccess} />
        )}

        {step === "booking" && client && (
          <AppointmentBooking 
            client={client}
            onSuccess={handleBookingSuccess}
            onBack={handleBackToIdentify}
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