import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy, Calendar, Clock, MapPin, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function BookingConfirmation({ booking, client, shopSettings }) {
  const [copied, setCopied] = useState(false);
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [syncingApple, setSyncingApple] = useState(false);

  const shopAddress = shopSettings?.shop_address || "123 Main St, Your City, ST 12345";

  const bookingDateTime = new Date(`${booking.date}T${booking.start_time}`);
  const formattedDateTime = format(bookingDateTime, "EEEE, MMMM d, yyyy 'at' h:mm a");

  const confirmationDetails = `
Stand Tall Barbershop
${shopAddress}

Appointment Confirmation
${formattedDateTime}

Service: ${booking.service_name}
Barber: ${booking.barber_name}
Price: $${booking.price}

Client: ${client.name}
Phone: ${client.phone}
Email: ${client.email}

Confirmation #${booking.id}
  `.trim();

  const handleCopyDetails = () => {
    navigator.clipboard.writeText(confirmationDetails);
    toast.success("Details copied to clipboard!");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoogleCalendar = async () => {
    setSyncingGoogle(true);
    try {
      const startDateTime = `${booking.date.replace(/-/g, "")}T${booking.start_time.replace(/:/g, "")}00`;
      const endDateTime = `${booking.date.replace(/-/g, "")}T${booking.end_time.replace(/:/g, "")}00`;
      
      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(booking.service_name + " at Stand Tall Barbershop")}&dates=${startDateTime}/${endDateTime}&details=${encodeURIComponent(confirmationDetails)}&location=${encodeURIComponent(shopAddress)}`;
      
      window.open(googleCalendarUrl, "_blank");
      toast.success("Opening Google Calendar...");
    } catch (error) {
      toast.error("Failed to sync with Google Calendar");
    }
    setSyncingGoogle(false);
  };

  const handleAppleCalendar = async () => {
    setSyncingApple(true);
    try {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Stand Tall Barbershop//EN
BEGIN:VEVENT
SUMMARY:${booking.service_name} at Stand Tall Barbershop
DTSTART:${booking.date.replace(/-/g, "")}T${booking.start_time.replace(/:/g, "")}00
DTEND:${booking.date.replace(/-/g, "")}T${booking.end_time.replace(/:/g, "")}00
LOCATION:${shopAddress}
DESCRIPTION:${confirmationDetails.replace(/\n/g, "\\n")}
UID:${booking.id}@standtallbarbershop.com
END:VEVENT
END:VCALENDAR`;

      const blob = new Blob([icsContent], { type: "text/calendar" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "appointment.ics";
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success("Calendar file downloaded! Open it with your calendar app.");
    } catch (error) {
      toast.error("Failed to create calendar file");
    }
    setSyncingApple(false);
  };

  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardContent className="pt-6 space-y-4">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-[#0A0A0A]">Appointment Confirmed!</h2>
          <p className="text-sm text-gray-600 mt-2">Your booking has been saved</p>
        </div>

        {/* Details */}
        <div className="bg-white rounded-lg p-4 space-y-3 border border-gray-100">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-[#C9A94E] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Date & Time</p>
              <p className="font-semibold text-sm">{formattedDateTime}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-[#C9A94E] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Service</p>
              <p className="font-semibold text-sm">{booking.service_name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-[#C9A94E] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Barber</p>
              <p className="font-semibold text-sm">{booking.barber_name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#C9A94E] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Location</p>
              <p className="font-semibold text-sm">{shopAddress}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-2 border-t">
            <Clock className="w-5 h-5 text-[#C9A94E] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Price</p>
              <p className="font-bold text-lg text-[#C9A94E]">${booking.price}</p>
            </div>
          </div>
        </div>

        {/* Copy Details Button */}
        <Button
          onClick={handleCopyDetails}
          variant="outline"
          className="w-full border-gray-200"
        >
          <Copy className="w-4 h-4 mr-2" />
          {copied ? "Copied!" : "Copy Details"}
        </Button>

        {/* Calendar Sync Buttons */}
        <div className="space-y-2 pt-2">
          <p className="text-xs text-gray-500 text-center font-medium">Add to your calendar</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleGoogleCalendar}
              disabled={syncingGoogle}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
              variant="outline"
            >
              {syncingGoogle ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Calendar className="w-4 h-4 mr-2" />
              )}
              Google
            </Button>
            <Button
              onClick={handleAppleCalendar}
              disabled={syncingApple}
              className="bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200"
              variant="outline"
            >
              {syncingApple ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Calendar className="w-4 h-4 mr-2" />
              )}
              Apple
            </Button>
          </div>
        </div>

        {/* Confirmation Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <p className="text-xs text-blue-700">
            A confirmation email has been sent to <strong>{client.email}</strong>
          </p>
        </div>

        <div className="text-center pt-2">
          <p className="text-xs text-gray-500">
            Confirmation #<span className="font-mono font-semibold">{booking.id}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

import { User } from "lucide-react";