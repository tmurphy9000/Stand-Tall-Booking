import React, { useState } from "react";
import { entities } from "@/api/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Lock,
  Wallet,
  CreditCard,
  Banknote,
  RotateCcw,
  Plus,
  Minus,
  History,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { format, startOfDay, endOfDay, parseISO } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import AddBarberDialog from "../components/payroll/AddBarberDialog";
import PastPayrollReports from "../components/payroll/PastPayrollReports";
import { usePermissions } from "../components/permissions/usePermissions";
import { usePlanGate } from "@/hooks/usePlanGate";
import PlanGateModal from "@/components/PlanGateModal";
import WithdrawalForm from "../components/cash/WithdrawalForm";
import CashInForm from "../components/cash/CashInForm";

const todayStr = () => format(new Date(), "yyyy-MM-dd");

function PaymentMethodBadge({ method }) {
  if (!method) return <span className="text-gray-300">—</span>;
  const map = {
    cash: { label: "Cash", color: "bg-green-50 text-green-700" },
    card: { label: "Card", color: "bg-blue-50 text-blue-700" },
    reader: { label: "Reader", color: "bg-indigo-50 text-indigo-700" },
    other: { label: "Other", color: "bg-gray-100 text-gray-600" },
  };
  const cfg = map[method] ?? { label: method, color: "bg-gray-100 text-gray-600" };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    completed: "bg-green-50 text-green-700",
    refunded: "bg-red-50 text-red-600",
    cancelled: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${map[status] ?? "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
}

function RefundModal({ booking, onClose, onRefunded }) {
  const [amountStr, setAmountStr] = useState(
    booking ? (booking.final_price ?? 0).toFixed(2) : "0.00"
  );
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRefund = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const amountCents = Math.round(parseFloat(amountStr) * 100);
      const fullCents = Math.round((booking.final_price ?? 0) * 100);

      const res = await supabase.functions.invoke("stripe-refund-checkout", {
        body: {
          bookingId: booking.id,
          amountCents: amountCents < fullCents ? amountCents : undefined,
          reason: reason || undefined,
        },
      });

      if (res.error || res.data?.error) {
        toast.error(res.data?.error ?? res.error?.message ?? "Refund failed");
      } else {
        toast.success(`Refund of $${(res.data.amount / 100).toFixed(2)} issued`);
        onRefunded();
        onClose();
      }
    } catch (e) {
      toast.error("Refund failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!booking) return null;
  const maxAmount = booking.final_price ?? 0;
  const parsedAmount = parseFloat(amountStr) || 0;
  const isValid = parsedAmount > 0 && parsedAmount <= maxAmount;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Refund Checkout</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Client</span>
              <span className="font-medium">{booking.client_name || "Walk-in"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Service</span>
              <span>{booking.service_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Original total</span>
              <span className="font-semibold">${maxAmount.toFixed(2)}</span>
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Refund amount</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={maxAmount}
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                className="pl-6 h-9"
              />
            </div>
            {parsedAmount < maxAmount && parsedAmount > 0 && (
              <p className="text-[10px] text-amber-600 mt-1">Partial refund — ${(maxAmount - parsedAmount).toFixed(2)} retained</p>
            )}
          </div>
          <div>
            <Label className="text-xs text-gray-500">Reason (optional)</Label>
            <Input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Client request"
              className="h-9 mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            onClick={handleRefund}
            disabled={loading || !isValid}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Issue Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TransactionsPage() {
  const { hasFullAccess } = usePermissions();

  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [expandedBarber, setExpandedBarber] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pastReportsOpen, setPastReportsOpen] = useState(false);
  const [gateResult, setGateResult] = useState(null);
  const [refundBooking, setRefundBooking] = useState(null);
  const [showCashIn, setShowCashIn] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const { checkBarberLimit } = usePlanGate();
  const queryClient = useQueryClient();

  const { data: barbers = [], isLoading: barbersLoading } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => entities.Barber.list(),
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["transactions-bookings", startDate, endDate],
    queryFn: async () => {
      const all = await entities.Booking.filter({ status: "completed" });
      const refunded = await entities.Booking.filter({ status: "refunded" });
      return [...all, ...refunded].filter(b => b.date >= startDate && b.date <= endDate);
    },
  });

  const { data: cashTransactions = [], isLoading: cashLoading } = useQuery({
    queryKey: ["cash-transactions"],
    queryFn: () => entities.CashTransaction.list("-created_date", 500),
  });

  const createTx = useMutation({
    mutationFn: (data) => entities.CashTransaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
      setShowCashIn(false);
      setShowWithdrawal(false);
    },
  });

  const isLoading = barbersLoading || bookingsLoading || cashLoading;

  if (!hasFullAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <Lock className="w-8 h-8 text-gray-400 mx-auto" />
          <p className="font-medium text-gray-700">Access Denied</p>
          <p className="text-sm text-gray-500">Contact your owner or manager.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#8B9A7E]" />
      </div>
    );
  }

  // Cash drawer stats (all-time)
  const cashOnHand = cashTransactions.reduce((s, tx) => {
    return tx.type === "inflow" ? s + (tx.amount || 0) : s - (tx.amount || 0);
  }, 0);

  // Revenue for date range
  const completedBookings = bookings.filter(b => b.status === "completed" || b.status === "refunded");
  const cashBookings = completedBookings.filter(b => b.payment_method === "cash" || b.payment_method === "other");
  const cardBookings = completedBookings.filter(b => b.payment_method === "card" || b.payment_method === "reader");
  const cashRevenue = cashBookings.reduce((s, b) => s + (b.final_price ?? b.price ?? 0), 0);
  const cardRevenue = cardBookings.reduce((s, b) => s + (b.final_price ?? b.price ?? 0), 0);
  const totalRevenue = completedBookings.reduce((s, b) => s + (b.final_price ?? b.price ?? 0), 0);

  // Barber commission data (mirrored from Payroll.jsx)
  const barberMap = Object.fromEntries(barbers.map(b => [b.id, b]));
  const payrollData = barbers
    .filter(b => b.is_active !== false)
    .map(barber => {
      const bb = bookings.filter(b => b.barber_id === barber.id && b.status === "completed");
      const serviceRevenue = bb.reduce((s, b) => s + (b.price ?? 0), 0);
      const productRevenue = bb.reduce((s, b) => s + (b.product_revenue ?? 0), 0);
      const tips = bb.reduce((s, b) => s + (b.tip ?? 0), 0);
      const serviceCommissionRate = barber.service_commission_rate ?? 50;
      const productCommissionRate = barber.product_commission_rate ?? 10;
      const serviceCommission = serviceRevenue * (serviceCommissionRate / 100);
      const productCommission = productRevenue * (productCommissionRate / 100);
      const totalEarnings = serviceCommission + productCommission + tips;
      return {
        id: barber.id,
        name: barber.name,
        serviceCommissionRate,
        productCommissionRate,
        serviceRevenue,
        productRevenue,
        serviceCommission,
        productCommission,
        tips,
        totalEarnings,
        completedServices: bb.length,
        bookings: bb,
      };
    });

  const grandTotal = payrollData.reduce((s, b) => s + b.totalEarnings, 0);

  const setToday = () => {
    const t = todayStr();
    setStartDate(t);
    setEndDate(t);
  };

  const setThisWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    setStartDate(format(monday, "yyyy-MM-dd"));
    setEndDate(todayStr());
  };

  const setThisMonth = () => {
    const now = new Date();
    setStartDate(format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd"));
    setEndDate(todayStr());
  };

  const sortedBookings = [...bookings].sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return (b.start_time ?? "").localeCompare(a.start_time ?? "");
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[#0A0A0A]">Transactions</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={setToday}
            className="text-xs border-[#8B9A7E] text-[#8B9A7E] hover:bg-[#8B9A7E]/10 h-8">
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={setThisWeek}
            className="text-xs border-[#8B9A7E] text-[#8B9A7E] hover:bg-[#8B9A7E]/10 h-8">
            This Week
          </Button>
          <Button variant="outline" size="sm" onClick={setThisMonth}
            className="text-xs border-[#8B9A7E] text-[#8B9A7E] hover:bg-[#8B9A7E]/10 h-8">
            This Month
          </Button>
          <Calendar className="w-4 h-4 text-[#8B9A7E]" />
          <div className="flex items-center gap-1.5">
            <div>
              <Label className="text-[10px] text-gray-500 block">From</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 w-36 text-xs" />
            </div>
            <div>
              <Label className="text-[10px] text-gray-500 block">To</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 w-36 text-xs" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-[#0A0A0A] rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-[#C9A94E]" />
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Cash on Hand</span>
          </div>
          <p className="text-2xl font-bold text-[#C9A94E]">${cashOnHand.toFixed(2)}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">All-time net</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Banknote className="w-4 h-4 text-green-600" />
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Cash</span>
          </div>
          <p className="text-2xl font-bold text-green-700">${cashRevenue.toFixed(2)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{cashBookings.length} transaction{cashBookings.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Card</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">${cardRevenue.toFixed(2)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{cardBookings.length} transaction{cardBookings.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-gradient-to-br from-[#8B9A7E]/10 to-[#B0BFA4]/10 rounded-xl border border-[#8B9A7E]/20 p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-[#0A0A0A]">${totalRevenue.toFixed(2)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{completedBookings.length} checkout{completedBookings.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Cash Drawer Quick Actions */}
      <div className="flex gap-2 mb-6">
        <Button onClick={() => setShowCashIn(true)} variant="outline" size="sm"
          className="h-8 text-xs border-green-200 text-green-700 hover:bg-green-50">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Cash In
        </Button>
        <Button onClick={() => setShowWithdrawal(true)} variant="outline" size="sm"
          className="h-8 text-xs border-amber-200 text-amber-700 hover:bg-amber-50">
          <Minus className="w-3.5 h-3.5 mr-1" />
          Log Withdrawal
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPastReportsOpen(true)}
          className="h-8 text-xs border-[#8B9A7E] text-[#8B9A7E] hover:bg-[#8B9A7E]/10">
          <History className="w-3.5 h-3.5 mr-1" />
          Past Reports
        </Button>
        <Button size="sm"
          onClick={() => {
            const activeCount = barbers.filter(b => b.is_active !== false).length;
            const result = checkBarberLimit(activeCount);
            if (!result.allowed) {
              toast.error(`${result.planName} plan limit reached`, {
                description: `You've reached the ${result.limit}-barber limit.`,
                action: { label: "Upgrade", onClick: () => { window.location.href = "/Settings?tab=subscription"; } },
              });
              setGateResult(result);
              return;
            }
            setDialogOpen(true);
          }}
          className="h-8 text-xs bg-[#8B9A7E] hover:bg-[#6B7A5E]">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Barber
        </Button>
      </div>

      {/* Transaction List */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Transactions
            <span className="ml-2 text-[11px] text-gray-400 font-normal">
              {format(parseISO(startDate), "MMM d")}
              {startDate !== endDate && ` – ${format(parseISO(endDate), "MMM d")}`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedBookings.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">No transactions in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] text-gray-400 uppercase tracking-wider">
                    <th className="text-left px-4 py-2 font-medium">Time</th>
                    <th className="text-left px-4 py-2 font-medium">Client</th>
                    <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Service</th>
                    <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Barber</th>
                    <th className="text-left px-4 py-2 font-medium">Method</th>
                    <th className="text-right px-4 py-2 font-medium">Total</th>
                    <th className="text-right px-4 py-2 font-medium hidden md:table-cell">Commission</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    {hasFullAccess && <th className="px-4 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {sortedBookings.map(b => {
                    const barber = barberMap[b.barber_id];
                    const svcRate = barber?.service_commission_rate ?? 50;
                    const prodRate = barber?.product_commission_rate ?? 10;
                    const commission =
                      (b.price ?? 0) * (svcRate / 100) +
                      (b.product_revenue ?? 0) * (prodRate / 100) +
                      (b.tip ?? 0);
                    return (
                      <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-2.5 text-gray-500">
                          <div>{b.start_time ?? "—"}</div>
                          <div className="text-[10px] text-gray-400">{b.date}</div>
                        </td>
                        <td className="px-4 py-2.5 font-medium">{b.client_name || "Walk-in"}</td>
                        <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{b.service_name}</td>
                        <td className="px-4 py-2.5 text-gray-500 hidden md:table-cell">{b.barber_name}</td>
                        <td className="px-4 py-2.5">
                          <PaymentMethodBadge method={b.payment_method} />
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold">
                          ${(b.final_price ?? b.price ?? 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[#8B9A7E] hidden md:table-cell">
                          ${commission.toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={b.status} />
                        </td>
                        {hasFullAccess && (
                          <td className="px-4 py-2.5 text-right">
                            {b.stripe_payment_intent_id && b.status !== "refunded" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50 px-2"
                                onClick={() => setRefundBooking(b)}
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Refund
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commission Summary */}
      <Card className="mb-6 bg-gradient-to-br from-[#8B9A7E]/10 to-[#B0BFA4]/10 border-[#8B9A7E]/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-600">Commission Summary — Total Earnings Due</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-[#0A0A0A]">${grandTotal.toFixed(2)}</div>
          <p className="text-xs text-gray-500 mt-1">
            {format(parseISO(startDate), "MMM d")}
            {startDate !== endDate && ` – ${format(parseISO(endDate), "MMM d, yyyy")}`}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {payrollData.map(barber => {
          const isExpanded = expandedBarber === barber.id;
          return (
            <Card key={barber.id} className="border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <button
                  type="button"
                  className="w-full text-left p-5 cursor-pointer"
                  onClick={() => setExpandedBarber(isExpanded ? null : barber.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[#0A0A0A]">{barber.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 bg-[#8B9A7E]/10 text-[#8B9A7E] rounded-full font-medium">
                          {barber.serviceCommissionRate}% svc
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full font-medium">
                          {barber.productCommissionRate}% prod
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {barber.completedServices} service{barber.completedServices !== 1 ? "s" : ""}
                        {barber.serviceRevenue > 0 && ` · $${barber.serviceRevenue.toFixed(2)} svc`}
                        {barber.productRevenue > 0 && ` · $${barber.productRevenue.toFixed(2)} prod`}
                        {barber.tips > 0 && ` · $${barber.tips.toFixed(2)} tips`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#8B9A7E]">
                          ${barber.totalEarnings.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">total earnings</div>
                      </div>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 pb-5 pt-3 space-y-3">
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-500">Service Revenue</p>
                        <p className="text-lg font-bold mt-1">${barber.serviceRevenue.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400">{barber.completedServices} booking{barber.completedServices !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="bg-[#8B9A7E]/10 rounded-lg p-3">
                        <p className="text-gray-500">Service Commission</p>
                        <p className="text-lg font-bold text-[#8B9A7E] mt-1">${barber.serviceCommission.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400">{barber.serviceCommissionRate}% of service rev</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-500">Shop Keeps (Svc)</p>
                        <p className="text-lg font-bold mt-1">${(barber.serviceRevenue - barber.serviceCommission).toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400">{100 - barber.serviceCommissionRate}% of service rev</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-500">Product Revenue</p>
                        <p className="text-lg font-bold mt-1">${barber.productRevenue.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400">products sold</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <p className="text-gray-500">Product Commission</p>
                        <p className="text-lg font-bold text-purple-600 mt-1">${barber.productCommission.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400">{barber.productCommissionRate}% of product rev</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-gray-500">Tips</p>
                        <p className="text-lg font-bold text-blue-600 mt-1">${barber.tips.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400">100% to barber</p>
                      </div>
                    </div>
                    <div className="bg-[#0A0A0A] rounded-lg p-3 flex items-center justify-between text-xs">
                      <p className="text-gray-400">Total Earnings = service commission + product commission + tips</p>
                      <p className="text-lg font-bold text-[#8B9A7E]">${barber.totalEarnings.toFixed(2)}</p>
                    </div>
                    {barber.bookings.length > 0 ? (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Completed Services</p>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {barber.bookings
                            .slice()
                            .sort((a, b) => a.date.localeCompare(b.date))
                            .map(b => {
                              const svcPrice = b.price ?? 0;
                              const prodRev = b.product_revenue ?? 0;
                              const tipAmt = b.tip ?? 0;
                              const svcCommission = svcPrice * barber.serviceCommissionRate / 100;
                              const prodCommission = prodRev * barber.productCommissionRate / 100;
                              return (
                                <div key={b.id} className="flex items-center justify-between bg-white border border-gray-100 rounded px-3 py-2 text-xs">
                                  <div>
                                    <span className="font-medium">{b.client_name || "Walk-in"}</span>
                                    <span className="text-gray-400 ml-2">{b.service_name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-right flex-wrap justify-end">
                                    <span className="text-gray-400">{b.date}</span>
                                    <span className="font-semibold text-green-700">${svcPrice.toFixed(2)}</span>
                                    <span className="text-[#8B9A7E]">→ ${svcCommission.toFixed(2)}</span>
                                    {prodRev > 0 && <span className="text-purple-500">+${prodRev.toFixed(2)} prod → ${prodCommission.toFixed(2)}</span>}
                                    {tipAmt > 0 && <span className="text-blue-500">+${tipAmt.toFixed(2)} tip</span>}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-2">No completed bookings in this period.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {payrollData.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-gray-500">No active barbers found.</CardContent>
          </Card>
        )}
      </div>

      <AddBarberDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <PastPayrollReports open={pastReportsOpen} onClose={() => setPastReportsOpen(false)} />
      <PlanGateModal
        open={!!gateResult}
        onClose={() => setGateResult(null)}
        feature={gateResult?.feature}
        planName={gateResult?.planName}
        limit={gateResult?.limit}
      />
      <CashInForm
        open={showCashIn}
        onClose={() => setShowCashIn(false)}
        onSave={(data) => createTx.mutate(data)}
        barbers={barbers}
        saving={createTx.isPending}
      />
      <WithdrawalForm
        open={showWithdrawal}
        onClose={() => setShowWithdrawal(false)}
        onSave={(data) => createTx.mutate(data)}
        barbers={barbers}
        saving={createTx.isPending}
      />
      {refundBooking && (
        <RefundModal
          booking={refundBooking}
          onClose={() => setRefundBooking(null)}
          onRefunded={() => {
            queryClient.invalidateQueries({ queryKey: ["transactions-bookings"] });
            setRefundBooking(null);
          }}
        />
      )}
    </div>
  );
}
