import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Calendar, Star, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function ClientHistory() {
  const queryClient = useQueryClient();
  const [reviewDialog, setReviewDialog] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const clientId = localStorage.getItem("clientId");

  const { data: client } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const clients = await base44.entities.Client.filter({ id: clientId });
      return clients[0] || null;
    },
    enabled: !!clientId,
  });

  const { data: allBookings = [], isLoading } = useQuery({
    queryKey: ["client-all-bookings", client?.email],
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

  const createReview = useMutation({
    mutationFn: (data) => base44.entities.Review.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-reviews"] });
      setReviewDialog(null);
      setRating(5);
      setComment("");
    },
  });

  const today = format(new Date(), "yyyy-MM-dd");
  const upcoming = allBookings.filter(b => b.date >= today && b.status !== "cancelled" && b.status !== "completed");
  const completed = allBookings.filter(b => b.status === "completed");
  const cancelled = allBookings.filter(b => b.status === "cancelled");

  const handleSubmitReview = () => {
    if (!reviewDialog) return;
    createReview.mutate({
      client_id: clientId,
      client_name: client.name,
      barber_id: reviewDialog.barber_id,
      barber_name: reviewDialog.barber_name,
      booking_id: reviewDialog.id,
      service_name: reviewDialog.service_name,
      rating,
      comment,
      date: format(new Date(), "yyyy-MM-dd"),
    });
  };

  const BookingCard = ({ booking, showReview = false }) => {
    const hasReview = reviews.some(r => r.booking_id === booking.id);

    return (
      <div className="p-4 bg-white rounded-lg border border-gray-100">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-semibold">{booking.service_name}</p>
            <p className="text-sm text-gray-500">with {booking.barber_name}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded ${
            booking.status === "completed" ? "bg-green-100 text-green-600" :
            booking.status === "cancelled" ? "bg-red-100 text-red-600" :
            "bg-blue-100 text-blue-600"
          }`}>
            {booking.status}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400">
            <p>{format(new Date(booking.date), "MMM d, yyyy")} • {booking.start_time}</p>
            <p className="font-bold text-[#C9A94E] mt-1">${booking.final_price || booking.price}</p>
          </div>
          {showReview && !hasReview && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReviewDialog(booking)}
              className="gap-1"
            >
              <Star className="w-3 h-3" /> Review
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (!client) {
    return (
      <div className="p-4">
        <Link to={createPageUrl("ClientPortal")}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Portal
          </Button>
        </Link>
        <p className="text-center text-gray-500">Please log in to view your history</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link to={createPageUrl("ClientPortal")}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
          <h1 className="text-lg font-bold">Booking History</h1>
          <div className="w-20" />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#C9A94E]" />
          </div>
        ) : (
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-3 mt-4">
              {upcoming.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No upcoming appointments</p>
              ) : (
                upcoming.map(booking => <BookingCard key={booking.id} booking={booking} />)
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-3 mt-4">
              {completed.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No completed appointments</p>
              ) : (
                completed.map(booking => <BookingCard key={booking.id} booking={booking} showReview />)
              )}
            </TabsContent>

            <TabsContent value="cancelled" className="space-y-3 mt-4">
              {cancelled.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No cancelled appointments</p>
              ) : (
                cancelled.map(booking => <BookingCard key={booking.id} booking={booking} />)
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* My Reviews */}
        {reviews.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">My Reviews</CardTitle>
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
                  <p className="text-xs text-gray-600">{review.comment}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(review.date), "MMM d, yyyy")}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2">Rating</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating ? "fill-[#C9A94E] text-[#C9A94E]" : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Comment (optional)</p>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience..."
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setReviewDialog(null)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReview}
                className="flex-1 bg-[#C9A94E] hover:bg-[#A07D2B]"
                disabled={createReview.isPending}
              >
                {createReview.isPending ? "Submitting..." : "Submit Review"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}