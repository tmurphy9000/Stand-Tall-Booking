import React, { useState } from "react";
import { base44 } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "../components/permissions/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, Check, X, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function StaffSchedule() {
  const queryClient = useQueryClient();
  const { user, currentBarber, hasFullAccess } = usePermissions();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    reason: "",
  });

  const { data: timeOffRequests = [] } = useQuery({
    queryKey: ["timeOffRequests"],
    queryFn: () => base44.entities.TimeOffRequest.list("-created_date"),
  });

  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => base44.entities.Barber.list(),
  });

  const createRequest = useMutation({
    mutationFn: (data) => base44.entities.TimeOffRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeOffRequests"] });
      toast.success("Time-off request submitted");
      setShowRequestForm(false);
      setFormData({ start_date: "", end_date: "", reason: "" });
    },
  });

  const updateRequest = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimeOffRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeOffRequests"] });
      toast.success("Request updated");
    },
  });

  const handleSubmitRequest = () => {
    if (!currentBarber || !formData.start_date || !formData.end_date) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    createRequest.mutate({
      barber_id: currentBarber.id,
      barber_name: currentBarber.name,
      start_date: formData.start_date,
      end_date: formData.end_date,
      reason: formData.reason,
      status: "pending",
    });
  };

  const handleApprove = (request) => {
    updateRequest.mutate({
      id: request.id,
      data: {
        status: "approved",
        reviewed_by: user.full_name || user.email,
        reviewed_date: format(new Date(), "yyyy-MM-dd"),
      },
    });
  };

  const handleDeny = (request) => {
    updateRequest.mutate({
      id: request.id,
      data: {
        status: "denied",
        reviewed_by: user.full_name || user.email,
        reviewed_date: format(new Date(), "yyyy-MM-dd"),
      },
    });
  };

  const myRequests = currentBarber
    ? timeOffRequests.filter(r => r.barber_id === currentBarber.id)
    : [];

  const pendingRequests = timeOffRequests.filter(r => r.status === "pending");

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Staff Schedule</h1>
        {currentBarber && (
          <Button onClick={() => setShowRequestForm(true)} className="bg-[#8B9A7E] hover:bg-[#6B7A5E] text-[#FAFAF8] h-9">
            <Plus className="w-4 h-4 mr-2" /> Request Time Off
          </Button>
        )}
      </div>

      {/* My Requests */}
      {currentBarber && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Time-Off Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {myRequests.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No requests yet</p>
            ) : (
              <div className="space-y-2">
                {myRequests.map(request => (
                  <div key={request.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium">
                            {format(parseISO(request.start_date), "MMM d")} - {format(parseISO(request.end_date), "MMM d, yyyy")}
                          </span>
                        </div>
                        {request.reason && (
                          <p className="text-xs text-gray-600 mt-1">{request.reason}</p>
                        )}
                        {request.reviewed_by && (
                          <p className="text-xs text-gray-400 mt-2">
                            Reviewed by {request.reviewed_by} on {format(parseISO(request.reviewed_date), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                      <Badge
                        className={
                          request.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : request.status === "denied"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {request.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending Approvals (for admins/managers) */}
      {hasFullAccess && pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingRequests.map(request => (
              <div key={request.id} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{request.barber_name}</p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {format(parseISO(request.start_date), "MMM d")} - {format(parseISO(request.end_date), "MMM d, yyyy")}
                      </span>
                    </div>
                    {request.reason && (
                      <p className="text-xs text-gray-600 mt-2">{request.reason}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApprove(request)}
                      className="h-8"
                    >
                      <Check className="w-3 h-3 mr-1 text-green-600" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeny(request)}
                      className="h-8"
                    >
                      <X className="w-3 h-3 mr-1 text-red-600" />
                      Deny
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Approved Time Off (for admins/managers) */}
      {hasFullAccess && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approved Time Off</CardTitle>
          </CardHeader>
          <CardContent>
            {timeOffRequests.filter(r => r.status === "approved").length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No approved time off</p>
            ) : (
              <div className="space-y-2">
                {timeOffRequests
                  .filter(r => r.status === "approved")
                  .map(request => (
                    <div key={request.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{request.barber_name}</p>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {format(parseISO(request.start_date), "MMM d")} - {format(parseISO(request.end_date), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Approved</Badge>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Request Form Dialog */}
      <Dialog open={showRequestForm} onOpenChange={setShowRequestForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Time Off</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs text-gray-500">Start Date *</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">End Date *</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Reason (optional)</Label>
              <Textarea
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Vacation, personal day, etc."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestForm(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitRequest}
              disabled={createRequest.isPending}
              className="bg-[#8B9A7E] hover:bg-[#6B7A5E] text-[#FAFAF8]"
            >
              {createRequest.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!currentBarber && !hasFullAccess && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">You need to be linked to a barber profile to manage schedules.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}