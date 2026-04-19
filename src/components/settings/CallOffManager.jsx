import React, { useState } from "react";
import { base44 } from "@/api/supabaseClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CallOffManager() {
  const [selectedBarber, setSelectedBarber] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [message, setMessage] = useState("");

  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => base44.entities.Barber.list(),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings", selectedBarber, format(selectedDate, "yyyy-MM-dd")],
    queryFn: () => base44.entities.Booking.filter({
      barber_id: selectedBarber,
      date: format(selectedDate, "yyyy-MM-dd"),
      status: { $in: ["scheduled", "confirmed", "checked_in"] }
    }),
    enabled: !!selectedBarber,
  });

  const sendNotifications = useMutation({
    mutationFn: async () => {
      const selectedBookingsList = bookings.filter(b => selectedBookings.includes(b.id));
      
      for (const booking of selectedBookingsList) {
        if (booking.client_email) {
          await base44.integrations.Core.SendEmail({
            to: booking.client_email,
            subject: `Important Update About Your Appointment - ${format(selectedDate, "MMM d")}`,
            body: message,
          });
        }
      }
    },
    onSuccess: () => {
      toast.success(`Sent notifications to ${selectedBookings.length} client${selectedBookings.length !== 1 ? 's' : ''}`);
      setSelectedBookings([]);
      setMessage("");
    },
    onError: () => {
      toast.error("Failed to send notifications");
    },
  });

  const toggleBooking = (bookingId) => {
    setSelectedBookings(prev =>
      prev.includes(bookingId)
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  const selectAll = () => {
    setSelectedBookings(bookings.map(b => b.id));
  };

  const deselectAll = () => {
    setSelectedBookings([]);
  };

  const selectedBarberName = barbers.find(b => b.id === selectedBarber)?.name || "";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staff Call-Off Notifications</CardTitle>
          <p className="text-xs text-gray-500">Send courtesy notifications to clients when staff calls off</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Select Staff Member</Label>
            <Select value={selectedBarber} onValueChange={setSelectedBarber}>
              <SelectTrigger>
                <SelectValue placeholder="Choose staff member..." />
              </SelectTrigger>
              <SelectContent>
                {barbers.map(barber => (
                  <SelectItem key={barber.id} value={barber.id}>
                    {barber.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Select Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                />
              </PopoverContent>
            </Popover>
          </div>

          {selectedBarber && bookings.length > 0 && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-gray-500">Select Appointments to Notify</Label>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={selectAll} className="h-6 text-xs">
                      Select All
                    </Button>
                    <Button size="sm" variant="ghost" onClick={deselectAll} className="h-6 text-xs">
                      Deselect All
                    </Button>
                  </div>
                </div>
                <div className="border rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto">
                  {bookings.map(booking => (
                    <div key={booking.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                      <Checkbox
                        checked={selectedBookings.includes(booking.id)}
                        onCheckedChange={() => toggleBooking(booking.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{booking.client_name}</p>
                        <p className="text-xs text-gray-500">
                          {booking.start_time} • {booking.service_name}
                          {booking.client_email && ` • ${booking.client_email}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-500 mb-2 block">Message to Clients</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Hi [Client Name],\n\nUnfortunately, ${selectedBarberName} had to call off today due to illness. We sincerely apologize for the inconvenience.\n\nWe'd be happy to reschedule your appointment. Please call us at your earliest convenience.\n\nThank you for your understanding.\n\nStand Tall Barbershop`}
                  rows={8}
                  className="text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">This message will be sent via email to selected clients</p>
              </div>

              <Button
                onClick={() => sendNotifications.mutate()}
                disabled={selectedBookings.length === 0 || !message || sendNotifications.isPending}
                className="w-full bg-[#8B9A7E] hover:bg-[#6B7A5E]"
              >
                {sendNotifications.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Notifications to {selectedBookings.length} Client{selectedBookings.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </>
          )}

          {selectedBarber && bookings.length === 0 && (
            <Card className="bg-gray-50">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500">No scheduled appointments found for {selectedBarberName} on {format(selectedDate, "MMM d, yyyy")}</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}