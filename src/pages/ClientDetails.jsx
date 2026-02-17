import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Calendar, DollarSign, Phone, Mail, Star, Loader2 } from "lucide-react";
import { format } from "date-fns";
import ClientNotesCard from "../components/client/ClientNotesCard";

export default function ClientDetails() {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("id");

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ id: clientId });
      return clients[0] || null;
    },
    enabled: !!clientId,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["client-bookings", client?.email],
    queryFn: async () => {
      if (!client?.email) return [];
      return await base44.entities.Booking.filter({ client_email: client.email }, "-date");
    },
    enabled: !!client,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["client-reviews", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      return await base44.entities.Review.filter({ client_id: clientId }, "-date");
    },
    enabled: !!clientId,
  });

  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => base44.entities.Barber.list(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-[#C9A94E]" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-4">
        <p className="text-center text-gray-500">Client not found</p>
      </div>
    );
  }

  const completedBookings = bookings.filter(b => b.status === "completed");
  const upcomingBookings = bookings.filter(b => b.date >= format(new Date(), "yyyy-MM-dd") && b.status !== "cancelled" && b.status !== "completed");

  return (
    <div className="min-h-screen bg-[#FAFAF8] p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl("Calendar")}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Client Details</h1>
        </div>

        {/* Client Profile */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              {client.photo_url ? (
                <img src={client.photo_url} alt={client.name} className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#C9A94E]/20 flex items-center justify-center">
                  <User className="w-10 h-10 text-[#C9A94E]" />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{client.name}</h2>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-[#C9A94E]" />
                </div>
                <p className="text-2xl font-bold">{client.total_visits || 0}</p>
                <p className="text-xs text-gray-500">Total Visits</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-[#C9A94E]" />
                </div>
                <p className="text-2xl font-bold">${(client.total_spent || 0).toFixed(0)}</p>
                <p className="text-xs text-gray-500">Total Spent</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-[#C9A94E]" />
                </div>
                <p className="text-2xl font-bold">{reviews.length}</p>
                <p className="text-xs text-gray-500">Reviews</p>
              </div>
            </div>

            {client.last_visit && (
              <p className="text-xs text-gray-500 mt-4 text-center">
                Last visit: {format(new Date(client.last_visit), "MMM d, yyyy")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Client Preferences */}
        {(client.preferred_barber_ids?.length > 0 || client.preferred_service_ids?.length > 0 || client.preferred_brands?.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {client.preferred_barber_ids?.length > 0 && (
                <div>
                  <p className="text-gray-500 font-medium mb-2">Preferred Barbers:</p>
                  <div className="flex flex-wrap gap-2">
                    {client.preferred_barber_ids.map(barberId => {
                      const barber = barbers.find(b => b.id === barberId);
                      return barber ? (
                        <span key={barberId} className="px-3 py-1 bg-[#C9A94E]/10 text-[#C9A94E] rounded-full">
                          {barber.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              {client.preferred_service_ids?.length > 0 && (
                <div>
                  <p className="text-gray-500 font-medium mb-2">Preferred Services:</p>
                  <div className="flex flex-wrap gap-2">
                    {client.preferred_service_ids.map(serviceId => {
                      const service = services.find(s => s.id === serviceId);
                      return service ? (
                        <span key={serviceId} className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full">
                          {service.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              {client.preferred_brands?.length > 0 && (
                <div>
                  <p className="text-gray-500 font-medium mb-2">Preferred Brands:</p>
                  <div className="flex flex-wrap gap-2">
                    {client.preferred_brands.map(brand => (
                      <span key={brand} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                        {brand}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Staff Notes */}
        <ClientNotesCard client={client} />

        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {completedBookings.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No booking history</p>
            ) : (
              <div className="space-y-2">
                {completedBookings.slice(0, 5).map(booking => (
                  <div key={booking.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{booking.service_name}</p>
                        <p className="text-xs text-gray-500">with {booking.barber_name}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(booking.date), "MMM d, yyyy")} at {booking.start_time}
                        </p>
                      </div>
                      <p className="font-bold text-[#C9A94E]">${booking.final_price || booking.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reviews */}
        {reviews.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reviews Given</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reviews.map(review => (
                <div key={review.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm">{review.barber_name}</p>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < review.rating ? "fill-[#C9A94E] text-[#C9A94E]" : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-xs text-gray-600 mb-1">{review.comment}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {format(new Date(review.date), "MMM d, yyyy")}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}