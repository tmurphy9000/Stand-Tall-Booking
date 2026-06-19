import React, { useState, useMemo } from "react";
import { entities } from "@/api/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2, Calendar, Lock,
  Wallet, CreditCard, Banknote, RotateCcw, Plus, Minus,
  History, Download, Printer,
} from "lucide-react";
import { format, parseISO } from "date-fns";
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

function txId(booking) {
  return "#" + booking.id.replace(/-/g, "").slice(-8).toUpperCase();
}

function fmt(n) {
  return "$" + (n ?? 0).toFixed(2);
}

function productDisplay(b) {
  if (b.product_names) return b.product_names;
  if ((b.product_revenue ?? 0) > 0) return fmt(b.product_revenue);
  return null;
}

function PaymentMethodBadge({ method }) {
  if (!method) return <span className="text-gray-300 text-[10px]">—</span>;
  const map = {
    cash:   { label: "Cash",   color: "bg-green-50 text-green-700" },
    card:   { label: "Card",   color: "bg-blue-50 text-blue-700" },
    reader: { label: "Reader", color: "bg-indigo-50 text-indigo-700" },
    other:  { label: "Other",  color: "bg-gray-100 text-gray-600" },
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
    refunded:  "bg-red-50 text-red-600",
    cancelled: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${map[status] ?? "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
}

function RefundModal({ booking, onClose, onRefunded }) {
  const [amountStr, setAmountStr] = useState((booking?.final_price ?? 0).toFixed(2));
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRefund = async () => {
    setLoading(true);
    try {
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
        toast.success(`Refund of ${fmt(res.data.amount / 100)} issued`);
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
        <DialogHeader><DialogTitle>Refund Checkout</DialogTitle></DialogHeader>
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
              <span className="font-semibold">{fmt(maxAmount)}</span>
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Refund amount</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <Input type="number" step="0.01" min="0.01" max={maxAmount}
                value={amountStr} onChange={e => setAmountStr(e.target.value)} className="pl-6 h-9" />
            </div>
            {parsedAmount < maxAmount && parsedAmount > 0 && (
              <p className="text-[10px] text-amber-600 mt-1">
                Partial refund — {fmt(maxAmount - parsedAmount)} retained
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs text-gray-500">Reason (optional)</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g. Client request" className="h-9 mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleRefund} disabled={loading || !isValid}
            className="bg-red-600 hover:bg-red-700 text-white">
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pastReportsOpen, setPastReportsOpen] = useState(false);
  const [gateResult, setGateResult] = useState(null);
  const [refundBooking, setRefundBooking] = useState(null);
  const [showCashIn, setShowCashIn] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [refundsOnly, setRefundsOnly] = useState(false);
  const [cashOnly, setCashOnly] = useState(false);
  const { checkBarberLimit } = usePlanGate();
  const queryClient = useQueryClient();

  const { data: barbers = [], isLoading: barbersLoading } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => entities.Barber.list(),
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["transactions-bookings", startDate, endDate],
    queryFn: async () => {
      const all = await entities.Booking.filter({ status: { $in: ["completed", "refunded"] } });
      return all.filter(b => {
        // Use the local calendar date of when the checkout actually happened.
        // Fall back to the appointment date for bookings predating this field.
        const checkDate = b.completed_at
          ? format(new Date(b.completed_at), "yyyy-MM-dd")
          : b.date;
        return checkDate >= startDate && checkDate <= endDate;
      });
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

  const sortedBookings = useMemo(
    () =>
      [...bookings].sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return (b.start_time ?? "").localeCompare(a.start_time ?? "");
      }),
    [bookings]
  );

  const totals = useMemo(
    () =>
      bookings.reduce(
        (acc, b) => ({
          price:    acc.price    + (b.price ?? 0),
          tax:      acc.tax      + (b.tax_amount ?? 0),
          tip:      acc.tip      + (b.tip ?? 0),
          discount: acc.discount + (b.discount_amount ?? 0),
          total:    acc.total    + (b.final_price ?? b.price ?? 0),
        }),
        { price: 0, tax: 0, tip: 0, discount: 0, total: 0 }
      ),
    [bookings]
  );

  const displayBookings = useMemo(() => {
    let result = sortedBookings;
    if (refundsOnly) result = result.filter(b => b.status === "refunded" || b.status === "partially_refunded");
    if (cashOnly)    result = result.filter(b => b.payment_method === "cash");
    return result;
  }, [sortedBookings, refundsOnly, cashOnly]);

  const displayTotals = useMemo(
    () =>
      displayBookings.reduce(
        (acc, b) => ({
          price:          acc.price          + (b.price ?? 0),
          productRevenue: acc.productRevenue + (b.product_revenue ?? 0),
          tax:            acc.tax            + (b.tax_amount ?? 0),
          tip:            acc.tip            + (b.tip ?? 0),
          discount:       acc.discount       + (b.discount_amount ?? 0),
          total:          acc.total          + (b.final_price ?? b.price ?? 0),
        }),
        { price: 0, productRevenue: 0, tax: 0, tip: 0, discount: 0, total: 0 }
      ),
    [displayBookings]
  );

  const filteredCashTransactions = useMemo(
    () =>
      [...cashTransactions]
        .filter(tx => tx.date >= startDate && tx.date <= endDate)
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return (a.time ?? "").localeCompare(b.time ?? "");
        }),
    [cashTransactions, startDate, endDate]
  );

  const cashRunningBalances = useMemo(() => {
    const sorted = [...cashTransactions].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time ?? "").localeCompare(b.time ?? "");
    });
    const map = new Map();
    let running = 0;
    for (const tx of sorted) {
      running += tx.type === "inflow" ? (tx.amount || 0) : -(tx.amount || 0);
      map.set(tx.id, running);
    }
    return map;
  }, [cashTransactions]);

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

  if (barbersLoading || bookingsLoading || cashLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#8B9A7E]" />
      </div>
    );
  }

  const cashOnHand = cashTransactions.reduce(
    (s, tx) => tx.type === "inflow" ? s + (tx.amount || 0) : s - (tx.amount || 0),
    0
  );

  const cashBookings = bookings.filter(b => b.payment_method === "cash" || b.payment_method === "other");
  const cardBookings = bookings.filter(b => b.payment_method === "card" || b.payment_method === "reader");
  const cashRevenue  = cashBookings.reduce((s, b) => s + (b.final_price ?? b.price ?? 0), 0);
  const cardRevenue  = cardBookings.reduce((s, b) => s + (b.final_price ?? b.price ?? 0), 0);
  const totalRevenue = bookings.reduce((s, b) => s + (b.final_price ?? b.price ?? 0), 0);

  const dateLabel = startDate === endDate
    ? format(parseISO(startDate), "MMMM d, yyyy")
    : `${format(parseISO(startDate), "MMM d")} – ${format(parseISO(endDate), "MMM d, yyyy")}`;

  const setToday = () => { const t = todayStr(); setStartDate(t); setEndDate(t); };
  const setThisWeek = () => {
    const now = new Date(); const day = now.getDay();
    const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    setStartDate(format(mon, "yyyy-MM-dd")); setEndDate(todayStr());
  };
  const setThisMonth = () => {
    const now = new Date();
    setStartDate(format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd"));
    setEndDate(todayStr());
  };

  const exportCashLogCSV = () => {
    const headers = ["Date", "Time", "Employee", "Type", "Amount", "Note", "Running Balance"];
    const rows = filteredCashTransactions.map(tx => [
      tx.date ?? "",
      tx.time ?? "",
      tx.barber_name ?? "",
      tx.type === "inflow" ? "Deposit" : "Withdrawal",
      (tx.amount || 0).toFixed(2),
      tx.note ?? "",
      (cashRunningBalances.get(tx.id) ?? 0).toFixed(2),
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cash-log-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const headers = [
      "Transaction ID","Date","Time","Client","Service","Product","Barber",
      "Payment Method","Service Price","Product Price","Tax","Tip","Discount","Total","Status",
    ];
    const rows = displayBookings.map(b => [
      txId(b),
      b.date ?? "",
      b.start_time ?? "",
      b.client_name || "Walk-in",
      b.service_name ?? "",
      productDisplay(b) ?? "",
      b.barber_name ?? "",
      b.payment_method ?? "",
      (b.price ?? 0).toFixed(2),
      (b.product_revenue ?? 0).toFixed(2),
      (b.tax_amount ?? 0).toFixed(2),
      (b.tip ?? 0).toFixed(2),
      (b.discount_amount ?? 0).toFixed(2),
      (b.final_price ?? b.price ?? 0).toFixed(2),
      b.status ?? "",
    ]);
    const totalsRow = [
      `Total (${displayBookings.length})`, "", "", "", "", "", "", "",
      displayTotals.price.toFixed(2),
      displayTotals.productRevenue.toFixed(2),
      displayTotals.tax.toFixed(2),
      displayTotals.tip.toFixed(2),
      displayTotals.discount.toFixed(2),
      displayTotals.total.toFixed(2),
      "",
    ];
    const csv = [headers, ...rows, totalsRow]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `transactions-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const rows = displayBookings.map(b => `
      <tr>
        <td>${txId(b)}</td>
        <td>${b.date ?? ""} ${b.start_time ?? ""}</td>
        <td>${b.client_name || "Walk-in"}</td>
        <td>${b.service_name ?? ""}</td>
        <td>${productDisplay(b) ?? "—"}</td>
        <td>${b.barber_name ?? ""}</td>
        <td>${b.payment_method ?? "—"}</td>
        <td>${fmt(b.price)}</td>
        <td>${(b.product_revenue ?? 0) > 0 ? fmt(b.product_revenue) : "—"}</td>
        <td>${fmt(b.tax_amount)}</td>
        <td>${fmt(b.tip)}</td>
        <td>${fmt(b.discount_amount)}</td>
        <td><strong>${fmt(b.final_price ?? b.price)}</strong></td>
        <td>${b.status ?? ""}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Transactions — ${dateLabel}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 10px; color: #111; margin: 0; padding: 16px; }
    h2  { font-size: 15px; margin: 0 0 2px; }
    p   { margin: 0 0 10px; color: #666; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th  { background: #f0f0f0; text-align: left; padding: 5px 6px;
          font-size: 8px; text-transform: uppercase; letter-spacing: 0.4px;
          border-bottom: 1px solid #ccc; white-space: nowrap; }
    td  { padding: 4px 6px; border-bottom: 1px solid #eee; white-space: nowrap; }
    tfoot td { font-weight: bold; background: #f7f7f7; border-top: 2px solid #bbb; }
    @media print { @page { margin: 0.4in; size: landscape; } }
  </style>
</head>
<body>
  <h2>Stand Tall Barbershop — Transactions</h2>
  <p>${dateLabel}</p>
  <table>
    <thead>
      <tr>
        <th>ID</th><th>Date / Time</th><th>Client</th><th>Service</th><th>Product</th><th>Barber</th>
        <th>Method</th><th>Svc Price</th><th>Pdt Price</th><th>Tax</th><th>Tip</th><th>Discount</th>
        <th>Total</th><th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="7">Total (${displayBookings.length} transaction${displayBookings.length !== 1 ? "s" : ""})</td>
        <td>${fmt(displayTotals.price)}</td>
        <td>${displayTotals.productRevenue > 0 ? fmt(displayTotals.productRevenue) : "—"}</td>
        <td>${fmt(displayTotals.tax)}</td>
        <td>${fmt(displayTotals.tip)}</td>
        <td>${fmt(displayTotals.discount)}</td>
        <td>${fmt(displayTotals.total)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[#0A0A0A]">Transactions</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {[["Today", setToday], ["This Week", setThisWeek], ["This Month", setThisMonth]].map(([label, fn]) => (
            <Button key={label} variant="outline" size="sm" onClick={fn}
              className="text-xs border-[#8B9A7E] text-[#8B9A7E] hover:bg-[#8B9A7E]/10 h-8">
              {label}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefundsOnly(v => !v)}
            className={`text-xs h-8 gap-1.5 transition-colors ${
              refundsOnly
                ? "bg-red-600 border-red-600 text-white hover:bg-red-700 hover:border-red-700"
                : "border-red-300 text-red-500 hover:bg-red-50"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Refunded Transactions
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCashOnly(v => !v)}
            className={`text-xs h-8 gap-1.5 transition-colors ${
              cashOnly
                ? "bg-green-700 border-green-700 text-white hover:bg-green-800 hover:border-green-800"
                : "border-green-300 text-green-700 hover:bg-green-50"
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            Cash Transactions
          </Button>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#8B9A7E]" />
            <div>
              <Label className="text-[10px] text-gray-500 block">From</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 w-36 text-xs" />
            </div>
            <div>
              <Label className="text-[10px] text-gray-500 block">To</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 w-36 text-xs" />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}
            className="h-8 text-xs border-[#8B9A7E] text-[#8B9A7E] hover:bg-[#8B9A7E]/10 gap-1.5">
            <Download className="w-3.5 h-3.5" />Export
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}
            className="h-8 text-xs border-[#8B9A7E] text-[#8B9A7E] hover:bg-[#8B9A7E]/10 gap-1.5">
            <Printer className="w-3.5 h-3.5" />Print
          </Button>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-[#0A0A0A] rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-[#C9A94E]" />
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Cash on Hand</span>
          </div>
          <p className="text-2xl font-bold text-[#C9A94E]">{fmt(cashOnHand)}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">All-time net</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Banknote className="w-4 h-4 text-green-600" />
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Cash</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{fmt(cashRevenue)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{cashBookings.length} transaction{cashBookings.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Card</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{fmt(cardRevenue)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{cardBookings.length} transaction{cardBookings.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-gradient-to-br from-[#8B9A7E]/10 to-[#B0BFA4]/10 rounded-xl border border-[#8B9A7E]/20 p-4">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Total Revenue</span>
          <p className="text-2xl font-bold text-[#0A0A0A]">{fmt(totalRevenue)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{bookings.length} checkout{bookings.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Cash drawer + utility actions */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button onClick={() => setShowCashIn(true)} variant="outline" size="sm"
          className="h-8 text-xs border-green-200 text-green-700 hover:bg-green-50">
          <Plus className="w-3.5 h-3.5 mr-1" />Add Cash In
        </Button>
        <Button onClick={() => setShowWithdrawal(true)} variant="outline" size="sm"
          className="h-8 text-xs border-amber-200 text-amber-700 hover:bg-amber-50">
          <Minus className="w-3.5 h-3.5 mr-1" />Log Withdrawal
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPastReportsOpen(true)}
          className="h-8 text-xs border-[#8B9A7E] text-[#8B9A7E] hover:bg-[#8B9A7E]/10">
          <History className="w-3.5 h-3.5 mr-1" />Past Reports
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
          <Plus className="w-3.5 h-3.5 mr-1" />Add Barber
        </Button>
      </div>

      {/* Transaction table */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2 flex-wrap">
            Transactions
            <span className="text-[11px] text-gray-400 font-normal">{dateLabel}</span>
            {refundsOnly && (
              <span className="text-[11px] font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                {displayBookings.length} refund{displayBookings.length !== 1 ? "s" : ""} totaling -{fmt(displayTotals.total)}
              </span>
            )}
            {cashOnly && !refundsOnly && (
              <span className="text-[11px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                {displayBookings.length} cash payment{displayBookings.length !== 1 ? "s" : ""} totaling {fmt(displayTotals.total)}
              </span>
            )}
            {cashOnly && refundsOnly && (
              <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                {displayBookings.length} cash refund{displayBookings.length !== 1 ? "s" : ""} totaling -{fmt(displayTotals.total)}
              </span>
            )}
            <span className="ml-auto text-[11px] text-gray-400 font-normal">
              {displayBookings.length} result{displayBookings.length !== 1 ? "s" : ""}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {displayBookings.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">
              {refundsOnly && cashOnly
                ? "No cash refunds in this period."
                : refundsOnly
                  ? "No refunds in this period."
                  : cashOnly
                    ? "No cash transactions in this period."
                    : "No transactions in this period."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[860px]">
                <thead>
                  <tr className="border-b border-gray-100 text-[9px] text-gray-400 uppercase tracking-wider bg-gray-50/60">
                    <th className="text-left px-2 py-1.5 font-semibold whitespace-nowrap">ID</th>
                    <th className="text-left px-2 py-1.5 font-semibold whitespace-nowrap">Date / Time</th>
                    <th className="text-left px-2 py-1.5 font-semibold">Client</th>
                    <th className="text-left px-2 py-1.5 font-semibold hidden sm:table-cell">Service</th>
                    <th className="text-left px-2 py-1.5 font-semibold hidden sm:table-cell">Product</th>
                    <th className="text-left px-2 py-1.5 font-semibold hidden md:table-cell">Barber</th>
                    <th className="text-left px-2 py-1.5 font-semibold whitespace-nowrap">Method</th>
                    <th className="text-right px-1.5 py-1.5 font-semibold whitespace-nowrap hidden md:table-cell">Svc $</th>
                    <th className="text-right px-1.5 py-1.5 font-semibold whitespace-nowrap hidden md:table-cell">Pdt $</th>
                    <th className="text-right px-1.5 py-1.5 font-semibold whitespace-nowrap">Tax</th>
                    <th className="text-right px-1.5 py-1.5 font-semibold whitespace-nowrap">Tip</th>
                    <th className="text-right px-1.5 py-1.5 font-semibold whitespace-nowrap">Disc</th>
                    <th className="text-right px-1.5 py-1.5 font-semibold whitespace-nowrap text-[#0A0A0A]">Total</th>
                    <th className="text-left px-2 py-1.5 font-semibold whitespace-nowrap">Status</th>
                    {hasFullAccess && <th className="px-1.5 py-1.5" />}
                  </tr>
                </thead>
                <tbody>
                  {displayBookings.map(b => (
                    <tr key={b.id} className="border-b border-gray-50 hover:bg-[#8B9A7E]/5 transition-colors">
                      <td className="px-2 py-1.5 font-mono text-[9px] text-gray-400 whitespace-nowrap">{txId(b)}</td>
                      <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">
                        <div className="text-[10px]">{b.date}</div>
                        <div className="text-[9px] text-gray-400">{b.start_time ?? "—"}</div>
                      </td>
                      <td className="px-2 py-1.5 font-medium max-w-[90px]">
                        <div className="truncate">{b.client_name || "Walk-in"}</div>
                      </td>
                      <td className="px-2 py-1.5 text-gray-500 hidden sm:table-cell max-w-[110px]">
                        <div className="truncate">{b.service_name ?? "—"}</div>
                      </td>
                      <td className="px-2 py-1.5 text-gray-500 hidden sm:table-cell max-w-[90px]">
                        <div className="truncate">{productDisplay(b) ?? <span className="text-gray-300">—</span>}</div>
                      </td>
                      <td className="px-2 py-1.5 text-gray-500 hidden md:table-cell max-w-[80px]">
                        <div className="truncate">{b.barber_name ?? "—"}</div>
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap"><PaymentMethodBadge method={b.payment_method} /></td>
                      <td className="px-1.5 py-1.5 text-right whitespace-nowrap hidden md:table-cell">
                        {(b.price ?? 0) > 0 ? fmt(b.price) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-1.5 py-1.5 text-right whitespace-nowrap hidden md:table-cell text-gray-500">
                        {(b.product_revenue ?? 0) > 0 ? fmt(b.product_revenue) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-1.5 py-1.5 text-right whitespace-nowrap text-gray-500">
                        {(b.tax_amount ?? 0) > 0 ? fmt(b.tax_amount) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-1.5 py-1.5 text-right whitespace-nowrap text-blue-600">
                        {(b.tip ?? 0) > 0 ? fmt(b.tip) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-1.5 py-1.5 text-right whitespace-nowrap text-red-500">
                        {(b.discount_amount ?? 0) > 0
                          ? <span>-{fmt(b.discount_amount)}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-1.5 py-1.5 text-right whitespace-nowrap font-semibold">
                        {fmt(b.final_price ?? b.price)}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap"><StatusBadge status={b.status} /></td>
                      {hasFullAccess && (
                        <td className="px-1.5 py-1.5 text-right">
                          {b.stripe_payment_intent_id && b.status !== "refunded" && (
                            <Button variant="ghost" size="sm"
                              className="h-6 text-[9px] text-red-500 hover:text-red-600 hover:bg-red-50 px-1.5"
                              onClick={() => setRefundBooking(b)}>
                              <RotateCcw className="w-2.5 h-2.5 mr-1" />Refund
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#8B9A7E]/30 bg-[#8B9A7E]/5 font-semibold text-[10px]">
                    <td className="px-2 py-1.5 text-gray-600" colSpan={7}>
                      Total — {displayBookings.length} transaction{displayBookings.length !== 1 ? "s" : ""}
                    </td>
                    <td className="px-1.5 py-1.5 text-right whitespace-nowrap hidden md:table-cell">{displayTotals.price > 0 ? fmt(displayTotals.price) : "—"}</td>
                    <td className="px-1.5 py-1.5 text-right whitespace-nowrap hidden md:table-cell text-gray-500">{displayTotals.productRevenue > 0 ? fmt(displayTotals.productRevenue) : "—"}</td>
                    <td className="px-1.5 py-1.5 text-right whitespace-nowrap text-gray-600">{displayTotals.tax > 0 ? fmt(displayTotals.tax) : "—"}</td>
                    <td className="px-1.5 py-1.5 text-right whitespace-nowrap text-blue-700">{displayTotals.tip > 0 ? fmt(displayTotals.tip) : "—"}</td>
                    <td className="px-1.5 py-1.5 text-right whitespace-nowrap text-red-600">{displayTotals.discount > 0 ? <span>-{fmt(displayTotals.discount)}</span> : "—"}</td>
                    <td className="px-1.5 py-1.5 text-right whitespace-nowrap text-[#0A0A0A]">{fmt(displayTotals.total)}</td>
                    <td className="px-1.5 py-1.5" />
                    {hasFullAccess && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cash Drawer Log */}
      <Card className="mt-6">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2 flex-wrap">
            Cash Drawer Log
            <span className="text-[11px] text-gray-400 font-normal">{dateLabel}</span>
            <span className="ml-auto text-[11px] text-gray-400 font-normal">
              {filteredCashTransactions.length} entr{filteredCashTransactions.length !== 1 ? "ies" : "y"}
            </span>
            <Button variant="outline" size="sm" onClick={exportCashLogCSV}
              className="h-7 text-[10px] border-[#8B9A7E] text-[#8B9A7E] hover:bg-[#8B9A7E]/10 gap-1">
              <Download className="w-3 h-3" />Export
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredCashTransactions.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No cash drawer activity in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs table-fixed">
                <colgroup>
                  <col className="w-24" />
                  <col className="w-32" />
                  <col className="w-24" />
                  <col className="w-24" />
                  <col />
                  <col className="w-32" />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-100 text-[9px] text-gray-400 uppercase tracking-wider bg-gray-50/60">
                    <th className="text-left px-3 py-2 font-semibold">Date / Time</th>
                    <th className="text-left px-3 py-2 font-semibold">Employee</th>
                    <th className="text-left px-3 py-2 font-semibold">Type</th>
                    <th className="text-right px-3 py-2 font-semibold">Amount</th>
                    <th className="text-left px-3 py-2 font-semibold">Note</th>
                    <th className="text-right px-3 py-2 font-semibold">Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCashTransactions.map(tx => {
                    const isInflow = tx.type === "inflow";
                    const balance = cashRunningBalances.get(tx.id) ?? 0;
                    return (
                      <tr key={tx.id} className="border-b border-gray-50 hover:bg-[#8B9A7E]/5 transition-colors">
                        <td className="px-3 py-2.5 text-gray-500">
                          <div className="text-[10px]">{tx.date}</div>
                          <div className="text-[9px] text-gray-400">{tx.time ?? "—"}</div>
                        </td>
                        <td className="px-3 py-2.5 font-medium truncate">{tx.barber_name || "—"}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            isInflow ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {isInflow ? "Deposit" : "Withdrawal"}
                          </span>
                        </td>
                        <td className={`px-3 py-2.5 text-right font-semibold ${isInflow ? "text-green-700" : "text-amber-700"}`}>
                          {isInflow ? "+" : "−"}{fmt(tx.amount)}
                        </td>
                        <td className="px-3 py-2.5 text-gray-400 text-[10px]">
                          <div className="truncate">{tx.note || <span className="text-gray-300">—</span>}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-[10px] text-gray-600">{fmt(balance)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddBarberDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <PastPayrollReports open={pastReportsOpen} onClose={() => setPastReportsOpen(false)} />
      <PlanGateModal open={!!gateResult} onClose={() => setGateResult(null)}
        feature={gateResult?.feature} planName={gateResult?.planName} limit={gateResult?.limit} />
      <CashInForm open={showCashIn} onClose={() => setShowCashIn(false)}
        onSave={(d) => createTx.mutate(d)} barbers={barbers} saving={createTx.isPending} />
      <WithdrawalForm open={showWithdrawal} onClose={() => setShowWithdrawal(false)}
        onSave={(d) => createTx.mutate(d)} barbers={barbers} saving={createTx.isPending} />
      {refundBooking && (
        <RefundModal booking={refundBooking} onClose={() => setRefundBooking(null)}
          onRefunded={() => {
            queryClient.invalidateQueries({ queryKey: ["transactions-bookings"] });
            setRefundBooking(null);
          }} />
      )}
    </div>
  );
}
