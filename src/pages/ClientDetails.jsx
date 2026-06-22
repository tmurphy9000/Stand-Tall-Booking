import React, { useState, useEffect } from "react";
import { entities } from "@/api/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, User, Phone, Mail, Loader2, ShieldAlert, MessageSquare, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createPageUrl, formatPhoneNumber } from "../utils";
import { usePermissions } from "../components/permissions/usePermissions";
import { CopyButton } from "@/components/ui/copy-button";

export default function ClientDetails() {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("id");
  const { hasPermission, user: staffUser } = usePermissions();
  const canManageClients = hasPermission('clients.management', 'modify');
  const queryClient = useQueryClient();

  const toggleDepositRequired = useMutation({
    mutationFn: (required) => entities.Client.update(clientId, { deposit_required: required }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client", clientId] }),
  });

  const toggleSmsOptIn = useMutation({
    mutationFn: (optIn) => entities.Client.update(clientId, {
      sms_opt_in: optIn,
      sms_opt_in_updated_by: staffUser?.full_name || staffUser?.email || "staff",
      sms_opt_in_updated_at: new Date().toISOString(),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client", clientId] }),
  });

  const saveBirthdate = useMutation({
    mutationFn: (birthdate) => entities.Client.update(clientId, { birthdate: birthdate || null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client", clientId] }),
  });

  const [birthdateInput, setBirthdateInput] = useState("");

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => entities.Client.filter({ id: clientId }).then(r => r[0]),
    enabled: !!clientId,
  });

  const { data: allBookings = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => entities.Booking.list("-date", 500),
    enabled: !!clientId,
  });

  const clientBookings = allBookings.filter(b => b.client_id === clientId);

  useEffect(() => {
    if (client) setBirthdateInput(client.birthdate ?? "");
  }, [client]);

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#C9A94E]" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <Link to={createPageUrl("ClientList")}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Clients
          </Button>
        </Link>
        <p className="text-gray-500 mt-4">Client not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("ClientList")}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Clients
            </Button>
          </Link>
        </div>

        {/* Client Header */}
        <div className="flex items-center gap-4 mb-6">
          {client.photo_url ? (
            <img src={client.photo_url} alt={client.name} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="w-8 h-8 text-gray-400" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{client.name}</h1>
            {canManageClients && (
              <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                {client.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />{client.email}
                    <CopyButton value={client.email} />
                  </span>
                )}
                {client.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />{formatPhoneNumber(client.phone)}
                    <CopyButton value={formatPhoneNumber(client.phone)} />
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{client.total_visits || 0}</p>
              <p className="text-xs text-gray-500">Total Visits</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">${(client.total_spent || 0).toFixed(0)}</p>
              <p className="text-xs text-gray-500">Total Spent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-500">{client.no_show_count || 0}</p>
              <p className="text-xs text-gray-500">No Shows</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-500">{client.late_count || 0}</p>
              <p className="text-xs text-gray-500">Late</p>
            </CardContent>
          </Card>
        </div>

        {/* Deposit Required */}
        {canManageClients && (
          <Card className="mb-6">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Deposit Required</p>
                  <p className="text-xs text-gray-500">Always collect a deposit from this client before booking</p>
                </div>
              </div>
              <Switch
                checked={!!client.deposit_required}
                onCheckedChange={(val) => toggleDepositRequired.mutate(val)}
                disabled={toggleDepositRequired.isPending}
              />
            </CardContent>
          </Card>
        )}

        {/* SMS Reminders opt-in */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <MessageSquare className="w-4 h-4 text-[#8B9A7E] mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">SMS Reminders</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {client.sms_opt_in
                      ? "Client has opted in to SMS appointment reminders"
                      : "Client has not opted in to SMS appointment reminders"}
                  </p>
                  {client.sms_opt_in_updated_by && (
                    <p className="text-xs text-gray-400 mt-1">
                      Last updated by <span className="font-medium">{client.sms_opt_in_updated_by}</span>
                      {client.sms_opt_in_updated_at && (
                        <> on {new Date(client.sms_opt_in_updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {new Date(client.sms_opt_in_updated_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</>
                      )}
                    </p>
                  )}
                </div>
              </div>
              <Switch
                checked={!!client.sms_opt_in}
                onCheckedChange={(val) => toggleSmsOptIn.mutate(val)}
                disabled={toggleSmsOptIn.isPending}
                className="flex-shrink-0 data-[state=checked]:bg-[#8B9A7E]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Birthdate */}
        {canManageClients && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-4 h-4 text-[#8B9A7E] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Birthday</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Used for automated birthday emails</p>
                  </div>
                </div>
                <Input
                  type="date"
                  value={birthdateInput}
                  onChange={e => setBirthdateInput(e.target.value)}
                  onBlur={e => {
                    const val = e.target.value;
                    if (val !== (client.birthdate ?? "")) saveBirthdate.mutate(val);
                  }}
                  disabled={saveBirthdate.isPending}
                  className="w-40 h-8 text-sm"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Staff Notes */}
        {client.staff_notes && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Staff Notes</p>
              <p className="text-sm text-gray-700">{client.staff_notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Booking History */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Booking History</h2>
          <div className="space-y-2">
            {clientBookings.length === 0 ? (
              <p className="text-sm text-gray-400">No bookings found.</p>
            ) : (
              clientBookings.map(b => (
                <Card key={b.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{b.service_name}</p>
                      <p className="text-xs text-gray-500">{b.barber_name} • {b.date} {b.start_time}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">${(b.final_price || b.price || 0).toFixed(2)}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        b.status === "completed" ? "bg-green-100 text-green-700" :
                        b.status === "cancelled" ? "bg-red-100 text-red-700" :
                        b.status === "no_show" ? "bg-orange-100 text-orange-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>{b.status}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
