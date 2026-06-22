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
import { Pencil, Trash2, DollarSign, Eye, EyeOff, PlayCircle, Upload, CheckCircle, AlertCircle, Link2, Link2Off, Loader2, Users, Calendar } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "../permissions/usePermissions";
import AccessDenied from "./AccessDenied";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";

const GUSTO_REDIRECT_URI = window.location.origin;

function buildGustoAuthUrl(clientId, state) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: GUSTO_REDIRECT_URI,
    response_type: "code",
    state,
  });
  // TODO: switch to api.gusto.com once the app is approved for production in the Gusto developer dashboard
  return `https://api.gusto-demo.com/oauth/authorize?${params.toString()}`;
}

export default function PayrollManager() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canManagePayroll = hasPermission('payroll.management');
  const { shopId } = useShop();
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showSSN, setShowSSN] = useState({});
  const [showAccount, setShowAccount] = useState({});
  const [connectingGusto, setConnectingGusto] = useState(false);
  const [disconnectingGusto, setDisconnectingGusto] = useState(false);
  const [selectedPayrollUuid, setSelectedPayrollUuid] = useState(null);

  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => entities.Barber.list(),
  });

  const { data: sensitiveInfo = [] } = useQuery({
    queryKey: ["barberSensitiveInfo"],
    queryFn: () => entities.BarberSensitiveInfo.list(),
    enabled: canManagePayroll,
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
    enabled: canManagePayroll && !!shopId,
  });

  const isGustoConnected = !!gustoConnection;

  const { data: payrollRuns = [], isLoading: payrollRunsLoading } = useQuery({
    queryKey: ["gustoPayrollRuns", shopId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("gusto-payroll-runs");
      if (error) throw error;
      return data.payrolls ?? [];
    },
    enabled: isGustoConnected && canManagePayroll,
    retry: false,
  });

  const { data: payrollDetail, isLoading: payrollDetailLoading, error: payrollDetailError } = useQuery({
    queryKey: ["gustoPayrollDetail", selectedPayrollUuid],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("gusto-payroll-detail", {
        body: { payroll_uuid: selectedPayrollUuid },
      });
      if (error) throw error;
      return data.payroll;
    },
    enabled: !!selectedPayrollUuid,
    retry: false,
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

  if (!canManagePayroll) {
    return <AccessDenied />;
  }

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
                Don't have a Gusto account yet?{" "}
                <a
                  href="https://gusto.com/i/tanner4388589a"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-600"
                >
                  Sign up here
                </a>
                .
              </p>
              <p className="text-[10px] text-gray-400 leading-relaxed">
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

        {sensitiveInfo.length === 0 && !isGustoConnected && (
          <Card>
            <CardContent className="p-8 text-center">
              <DollarSign className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No payroll information yet</p>
              <p className="text-xs text-gray-400 mt-1">Invite barbers to add their banking details</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Gusto-connected sections ─────────────────────────────────── */}
      {isGustoConnected && (
        <div className="space-y-6 mt-2">

          {/* 1. Barber Sync Status */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold">Barber Sync Status</h3>
            </div>
            <div className="space-y-2">
              {barbers.filter(b => b.is_active !== false).map(barber => (
                <div
                  key={barber.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-muted/30 border border-gray-100 dark:border-border"
                >
                  <p className="text-xs font-medium">{barber.name}</p>
                  {/* Placeholder — real sync check will be wired up later */}
                  <span className="text-[10px] font-medium bg-gray-100 dark:bg-muted text-gray-500 dark:text-gray-300 px-2 py-0.5 rounded-full">
                    Not yet synced
                  </span>
                </div>
              ))}
              {barbers.filter(b => b.is_active !== false).length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">No active barbers found.</p>
              )}
            </div>
          </div>

          {/* 2. Recent Payroll Runs */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold">Recent Payroll Runs</h3>
            </div>
            {payrollRunsLoading ? (
              <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading payroll runs…
              </div>
            ) : payrollRuns.length === 0 ? (
              <div className="text-center py-6 rounded-lg bg-gray-50 dark:bg-muted/30 border border-gray-100 dark:border-border">
                <DollarSign className="w-6 h-6 mx-auto text-gray-300 mb-1.5" />
                <p className="text-xs text-gray-500">No payroll runs yet — click <span className="font-medium">Run Payroll</span> to get started.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-100 dark:border-border overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[320px]">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-muted/30 border-b border-gray-100 dark:border-border">
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Pay Period</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Status</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollRuns.slice(0, 10).map((run, i) => {
                      const start = run.pay_period?.start_date ?? run.start_date;
                      const end = run.pay_period?.end_date ?? run.end_date;
                      const netPay = run.totals?.net_pay;
                      const processed = run.processed;
                      return (
                        <tr
                          key={run.payroll_uuid ?? i}
                          className="border-b border-gray-50 dark:border-border last:border-0 cursor-pointer hover:bg-amber-50/60 dark:hover:bg-amber-900/20 transition-colors"
                          onClick={() => run.payroll_uuid && setSelectedPayrollUuid(run.payroll_uuid)}
                        >
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                            {start && end
                              ? `${new Date(start + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(end + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {processed ? (
                              <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Processed</span>
                            ) : (
                              <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">Pending</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                            {netPay != null
                              ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(netPay))
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Payroll run detail dialog */}
      <Dialog open={!!selectedPayrollUuid} onOpenChange={(open) => !open && setSelectedPayrollUuid(null)}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base">
              {payrollDetail
                ? (() => {
                    const s = payrollDetail.pay_period?.start_date;
                    const e = payrollDetail.pay_period?.end_date;
                    if (!s || !e) return "Payroll Run";
                    return `${new Date(s + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(e + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
                  })()
                : "Payroll Run"}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 space-y-5 pr-1">
            {payrollDetailLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading details…
              </div>
            ) : payrollDetailError ? (
              <div className="flex items-center gap-2 py-8 text-sm text-red-500">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Failed to load payroll details. Please try again.
              </div>
            ) : payrollDetail ? (() => {
              const fmt = (val) =>
                val != null
                  ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(val))
                  : "—";
              const fmtDate = (d) =>
                d ? new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "—";

              return (
                <>
                  {/* Meta row: pay date + status */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      Pay date: <span className="text-gray-800 dark:text-gray-200 font-medium">{fmtDate(payrollDetail.check_date)}</span>
                    </span>
                    {payrollDetail.processed ? (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Processed</span>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Pending</span>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-gray-50 dark:bg-muted/30 border border-gray-100 dark:border-border px-4 py-3">
                      <p className="text-[10px] text-gray-400 mb-0.5">Gross Pay</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fmt(payrollDetail.totals?.gross_pay)}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 dark:bg-muted/30 border border-gray-100 dark:border-border px-4 py-3">
                      <p className="text-[10px] text-gray-400 mb-0.5">Net Pay</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fmt(payrollDetail.totals?.net_pay)}</p>
                    </div>
                  </div>

                  {/* Employee breakdown */}
                  {payrollDetail.employee_compensations?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Employee Breakdown</p>
                      <div className="rounded-lg border border-gray-100 dark:border-border overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-muted/30 border-b border-gray-100 dark:border-border">
                              <th className="text-left px-3 py-2 font-medium text-gray-500">Name</th>
                              <th className="text-right px-3 py-2 font-medium text-gray-500">Gross</th>
                              <th className="text-right px-3 py-2 font-medium text-gray-500">Net</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payrollDetail.employee_compensations.map((emp) => (
                              <tr key={emp.employee_uuid} className="border-b border-gray-50 dark:border-border last:border-0">
                                <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">{emp.employee_name}</td>
                                <td className="px-3 py-2 text-right text-gray-600">{fmt(emp.gross_pay)}</td>
                                <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 font-medium">{fmt(emp.net_pay)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Contractor payments (if any) */}
                  {payrollDetail.contractor_payments?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Contractor Payments</p>
                      <div className="rounded-lg border border-gray-100 dark:border-border overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-muted/30 border-b border-gray-100 dark:border-border">
                              <th className="text-left px-3 py-2 font-medium text-gray-500">Name</th>
                              <th className="text-right px-3 py-2 font-medium text-gray-500">Wage</th>
                              {payrollDetail.contractor_payments.some(c => c.hours) && (
                                <th className="text-right px-3 py-2 font-medium text-gray-500">Hours</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {payrollDetail.contractor_payments.map((cp) => (
                              <tr key={cp.contractor_uuid} className="border-b border-gray-50 dark:border-border last:border-0">
                                <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">{cp.contractor_name}</td>
                                <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 font-medium">{fmt(cp.wage)}</td>
                                {payrollDetail.contractor_payments.some(c => c.hours) && (
                                  <td className="px-3 py-2 text-right text-gray-600">{cp.hours ?? "—"}</td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {payrollDetail.employee_compensations?.length === 0 &&
                    payrollDetail.contractor_payments?.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">No employee breakdown available for this run.</p>
                  )}
                </>
              );
            })() : null}
          </div>
        </DialogContent>
      </Dialog>

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
