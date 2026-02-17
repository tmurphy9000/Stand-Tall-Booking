import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, User, Star, Clock, Phone, Mail, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function ClientPortal() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState(localStorage.getItem("clientId") || null);

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const clients = await base44.entities.Client.filter({ id: clientId });
      return clients[0] || null;
    },
    enabled: !!clientId,
  });

  const { data: upcomingBookings = [] } = useQuery({
    queryKey: ["client-bookings", client?.email],
    queryFn: async () => {
      if (!client?.email) return [];
      const bookings = await base44.entities.Booking.filter({ client_email: client.email });
      const today = format(new Date(), "yyyy-MM-dd");
      return bookings
        .filter(b => b.date >= today && b.status !== "cancelled" && b.status !== "completed")
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 3);
    },
    enabled: !!client,
  });

  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => base44.entities.Barber.list(),
  });

  const handleAuth = async (e) => {
    e.preventDefault();
    
    if (isLogin) {
      const clients = await base44.entities.Client.filter({ email });
      if (clients.length > 0) {
        localStorage.setItem("clientId", clients[0].id);
        setClientId(clients[0].id);
      } else {
        alert("No account found. Please sign up first.");
      }
    } else {
      const newClient = await base44.entities.Client.create({
        email,
        phone,
        name,
        total_visits: 0,
        total_spent: 0,
      });
      localStorage.setItem("clientId", newClient.id);
      setClientId(newClient.id);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("clientId");
    setClientId(null);
    setEmail("");
    setPhone("");
    setName("");
  };

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-[#C9A94E]" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FAFAF8] to-[#F5F3EE] p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              {isLogin ? "Welcome Back" : "Create Account"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                />
              </div>
              {!isLogin && (
                <>
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="555-0123"
                    />
                  </div>
                </>
              )}
              <Button type="submit" className="w-full bg-[#C9A94E] hover:bg-[#A07D2B]">
                {isLogin ? "Sign In" : "Sign Up"}
              </Button>
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAFAF8] to-[#F5F3EE] p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {client.name}</h1>
            <p className="text-sm text-gray-500">Stand Tall Client Portal</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#C9A94E]/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#C9A94E]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Visits</p>
                  <p className="text-2xl font-bold">{client.total_visits || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#C9A94E]/10 flex items-center justify-center">
                  <Star className="w-5 h-5 text-[#C9A94E]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Spent</p>
                  <p className="text-2xl font-bold">${(client.total_spent || 0).toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" /> Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingBookings.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No upcoming appointments</p>
            ) : (
              upcomingBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold">{booking.service_name}</p>
                    <p className="text-sm text-gray-500">with {booking.barber_name}</p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(booking.date), "MMM d, yyyy")} at {booking.start_time}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#C9A94E]">${booking.price}</p>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded">
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to={createPageUrl("ClientBooking")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-[#C9A94E] mx-auto flex items-center justify-center mb-2">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-semibold">Book Appointment</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl("ClientHistory")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-[#0A0A0A] mx-auto flex items-center justify-center mb-2">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-semibold">View History</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Our Barbers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Our Barbers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {barbers.filter(b => b.is_active).map((barber) => (
                <div key={barber.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-[#C9A94E] flex items-center justify-center text-white font-bold">
                    {barber.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{barber.name}</p>
                    <p className="text-xs text-gray-500">{barber.tier} tier</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-[#C9A94E] text-[#C9A94E]" />
                    <span className="text-sm font-semibold">4.8</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}