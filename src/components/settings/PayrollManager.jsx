import React, { useState, useEffect } from "react";
import { entities } from "@/api/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useShop } from "@/lib/shopContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Trash2, DollarSign, Eye, EyeOff, PlayCircle, Upload, CheckCircle, AlertCircle, Link2, Link2Off, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "../permissions/usePermissions";
import AccessDenied from "./AccessDenied";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";

const GUSTO_REDIRECT_URI = `${window.location.origin}/gusto/callback`;

function buildGustoAuthUrl(clientId, state) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: GUSTO_REDIRECT_URI,
    response_type: "code",
    state,
  });
  return `https://api.gusto.com/oauth/authorize?${params.toString()}`;
}

export default function PayrollManager() {
  const queryClient = useQueryClient();
  const { hasFullAccess } = usePermissions();
  const { shopId } = useShop();
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showSSN, setShowSSN] = useState({});
  const [showAccount, setShowAccount] = useState({});
  const [connectingGusto, setConnectingGusto] = useState(false);
  const [disconnectingGusto, setDisconnectingGusto] = useState(false);

  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => entities.Barber.list(),
  });

  const { data: sensitiveInfo = [] } = useQuery({
    queryKey: ["barberSensitiveInfo"],
    queryFn: () => entities.BarberSensitiveInfo.list(),
    enabled: hasFullAccess,
  });

  const { data: gustoConnection, isLoading: gustoLoading, refetch: refetchGusto } = useQuery({
    queryKey: ["gustoConnection", shopId],
    queryFn: async () => {
      if (!shopId) return null;
      const { data, error } = await supabase
        .from("gusto_connections")
        .select("company_uuid, company_name, connected_at")
        .eq("shop_id", shopId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: hasFullAccess && !!shopId,
  });

  // Handle redirect back from Gusto with ?gusto=connected
  useEffect(() => {
    if (searchParams.get("gusto") === "connected") {
      refetchGusto();
      toast.success("Gusto connected successfully!");
    }
  }, [searchParams]);

  const updateInfo = useMutation({
    mutationFn: ({ id, data }) => entities.BarberSensitiveInfo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barberSensitiveInfo"] });
      toast.success("Payroll information updated");
      setShowForm(false);
      setEditing(null);
    },
  });

  const deleteInfo = useMutation({
    mutationFn: (id) => entities.BarberSensitiveInfo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barberSensitiveInfo"] });
      toast.success("Payroll information deleted");
    },
  });

  const [form, setForm] = useState({
    bank_name: "",
    account_number: "",
    routing_number: "",
  });

  const openEdit = (info) => {
    setEditing(info);
    setForm({
      bank_name: info.bank_name || "",
      account_number: info.account_number || "",
      routing_number: info.routing_number || "",
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!editing) return;
    updateInfo.mutate({ id: editing.id, data: form });
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete payroll information? This cannot be undone.")) {
      deleteInfo.mutate(id);
    }
  };

  const handleConnectGusto = () => {
    const clientId = import.meta.env.VITE_GUSTO_CLIENT_ID;
    if (!clientId) {
      toast.error("Gusto client ID is not configured. Contact support.");
      return;
    }
    setConnectingGusto(true);
    const state = crypto.randomUUID();
    sessionStorage.setItem("gusto_oauth_state", state);
    window.location.href = buildGustoAuthUrl(clientId, state);
  };

  const handleDisconnectGusto = async () => {
    if (!window.confirm("Disconnect Gusto? You can reconnect at any time.")) return;
    setDisconnectingGusto(true);
    const { error } = await supabase
      .from("gusto_connections")
      .delete()
      .eq("shop_id", shopId);
    setDisconnectingGusto(false);
    if (error) {
      toast.error("Failed to disconnect Gusto: " + error.message);
      return;
    }
    refetchGusto();
    toast.success("Gusto disconnected.");
  };

  const maskSSN = (ssn) => {
    if (!ssn) return "N/A";
    return `***-**-${ssn.slice(-4)}`;
  };

  const maskAccount = (account) => {
    if (!account) return "N/A";
    return `****${account.slice(-4)}`;
  };

  if (!hasFullAccess) {
    return <AccessDenied />;
  }

  const isGustoConnected = !!gustoConnection;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Payroll & Sensitive Information</h3>
        <Link to={createPageUrl("RunPayroll")}>
          <Button size="sm" className="h-8 text-xs bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white gap-1">
            <PlayCircle className="w-3 h-3" /> Run Payroll
          </Button>
        </Link>
      </div>

      {/* Gusto Connection Card */}
      <Card className="border-[#F5A623]/30 bg-amber-50/40">
        <CardContent className="p-4">
          {gustoLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading Gusto status…
            </div>
          ) : isGustoConnected ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-700">Connected to Gusto</p>
                    {gustoConnection.company_name && (
                      <p className="text-xs text-gray-600">{gustoConnection.company_name}</p>
                    )}
                    {gustoConnection.connected_at && (
                      <p className="text-[10px] text-gray-400">
                        Connected {new Date(gustoConnection.connected_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs text-red-500 border-red-200 hover:bg-red-50 gap-1"
                  onClick={handleDisconnectGusto}
                  disabled={disconnectingGusto}
                >
                  {disconnectingGusto ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Link2Off className="w-3 h-3" />
                  )}
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Connect Gusto for Payroll</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Run payroll, file taxes, and manage benefits directly through Gusto.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0 h-8 text-xs bg-[#F5A623] hover:bg-[#e09620] text-white gap-1"
                  onClick={handleConnectGusto}
                  disabled={connectingGusto}
                >
                  {connectingGusto ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Link2 className="w-3 h-3" />
                  )}
                  Connect Gusto
                </Button>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed border-t border-amber-100 pt-2">
                Payroll processing is powered by Gusto. Plans start at $40/month + $6 per person, billed directly by Gusto. Stand Tall Booking never marks up or adds fees on top of third-party integrations.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {sensitiveInfo.map(info => {
          const barber = barbers.find(b => b.id === info.barber_id || b.email === info.barber_id);
          return (
            <Card key={info.id} className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">{barber?.name || "Unknown"}</p>
                    <p className="text-xs text-gray-500">{info.full_legal_name}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openEdit(info)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(info.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Driver's License:</span>
                    <span className="font-mono">{info.drivers_license_number || "N/A"}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">SSN:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        {showSSN[info.id] ? info.ssn : maskSSN(info.ssn)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setShowSSN(prev => ({ ...prev, [info.id]: !prev[info.id] }))}
                      >
                        {showSSN[info.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>

                  {info.bank_name && (
                    <>
                      <div className="border-t border-gray-100 my-2 pt-2" />
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Bank:</span>
                        <span>{info.bank_name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Routing #:</span>
                        <span className="font-mono">{info.routing_number || "N/A"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Account #:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">
                            {showAccount[info.id] ? info.account_number : maskAccount(info.account_number)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setShowAccount(prev => ({ ...prev, [info.id]: !prev[info.id] }))}
                          >
                            {showAccount[info.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {sensitiveInfo.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <DollarSign className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No payroll information yet</p>
              <p className="text-xs text-gray-400 mt-1">Invite barbers to add their banking details</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Gusto Import readiness (shown only when connected and barbers have info) */}
      {isGustoConnected && sensitiveInfo.length > 0 && (
        <div className="mt-6 border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold">Gusto Import</h3>
              <p className="text-xs text-gray-500">Barbers ready to be imported into Gusto</p>
            </div>
            <Button
              size="sm"
              disabled
              className="h-8 text-xs bg-[#F5A623] hover:bg-[#e09620] text-white gap-1 opacity-60 cursor-not-allowed"
            >
              <Upload className="w-3 h-3" /> Import Barbers
            </Button>
          </div>

          <div className="space-y-2">
            {sensitiveInfo.map(info => {
              const barber = barbers.find(b => b.id === info.barber_id || b.email === info.barber_id);
              const isComplete = info.full_legal_name && info.ssn && info.bank_name && info.account_number && info.routing_number;
              return (
                <div key={info.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2">
                    {isComplete ? (
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-medium">{info.full_legal_name || barber?.name || "Unknown"}</p>
                      <p className="text-[10px] text-gray-400">{isComplete ? "Ready to import" : "Missing payroll details"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 text-[10px]">
                    {info.bank_name && <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Bank ✓</span>}
                    {info.ssn && <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">SSN ✓</span>}
                    {!info.bank_name && <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">No Bank</span>}
                    {!info.ssn && <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">No SSN</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit banking info dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Banking Information</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-gray-500">Bank Name</Label>
              <Input
                value={form.bank_name}
                onChange={e => setForm(prev => ({ ...prev, bank_name: e.target.value }))}
                placeholder="Chase Bank"
              />
            </div>

            <div>
              <Label className="text-xs text-gray-500">Routing Number</Label>
              <Input
                value={form.routing_number}
                onChange={e => setForm(prev => ({ ...prev, routing_number: e.target.value }))}
                placeholder="123456789"
                maxLength={9}
              />
            </div>

            <div>
              <Label className="text-xs text-gray-500">Account Number</Label>
              <Input
                type="password"
                value={form.account_number}
                onChange={e => setForm(prev => ({ ...prev, account_number: e.target.value }))}
                placeholder="Account number"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-[#B0BFA4] hover:bg-[#8B9A7E] text-white">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
