import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BarberSelection({ client, onSuccess, onBack }) {
  const [selectedBarber, setSelectedBarber] = useState("");

  const { data: barbers = [], isLoading } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => base44.entities.Barber.list(),
  });

  const activeBarbers = barbers.filter(b => b.is_active && b.online_bookable);

  const handleContinue = () => {
    if (selectedBarber) {
      const barber = activeBarbers.find(b => b.id === selectedBarber);
      onSuccess(barber);
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-lg font-semibold text-[#0A0A0A]">Choose Your Barber</h2>
            <p className="text-sm text-gray-500 mt-1">Hi {client.name}! Who would you like?</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#8B9A7E]" />
            </div>
          ) : activeBarbers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No barbers available</p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {activeBarbers.map(barber => (
                <button
                  key={barber.id}
                  onClick={() => setSelectedBarber(barber.id)}
                  className={cn(
                    "p-4 rounded-lg border-2 transition text-left",
                    selectedBarber === barber.id
                      ? "border-[#8B9A7E] bg-[#8B9A7E]/5"
                      : "border-gray-200 hover:border-[#8B9A7E]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {barber.photo_url ? (
                      <img src={barber.photo_url} alt={barber.name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#8B9A7E] flex items-center justify-center text-white">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-[#0A0A0A]">{barber.name}</p>
                      <p className="text-xs text-gray-500">{barber.email}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <Button
            onClick={handleContinue}
            disabled={!selectedBarber}
            className="w-full bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white h-11"
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    </>
  );
}