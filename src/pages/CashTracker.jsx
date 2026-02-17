import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownLeft, ArrowUpRight, Minus, Plus, Search, Loader2, Wallet } from "lucide-react";
import WithdrawalForm from "../components/cash/WithdrawalForm";

export default function CashTrackerPage() {
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["cash-transactions"],
    queryFn: () => base44.entities.CashTransaction.list("-created_date", 500),
  });

  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => base44.entities.Barber.list(),
  });

  const createTx = useMutation({
    mutationFn: (data) => base44.entities.CashTransaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
      setShowWithdrawal(false);
    },
  });

  const filtered = transactions.filter(tx => {
    if (filterType !== "all" && tx.type !== filterType) return false;
    if (search && !tx.barber_name?.toLowerCase().includes(search.toLowerCase()) && !tx.note?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayTx = transactions.filter(tx => tx.date === todayStr);
  const todayInflow = todayTx.filter(tx => tx.type === "inflow").reduce((s, tx) => s + (tx.amount || 0), 0);
  const todayOutflow = todayTx.filter(tx => tx.type !== "inflow").reduce((s, tx) => s + (tx.amount || 0), 0);
  const cashOnHand = transactions.reduce((s, tx) => {
    if (tx.type === "inflow") return s + (tx.amount || 0);
    return s - (tx.amount || 0);
  }, 0);

  const typeConfig = {
    inflow: { icon: ArrowDownLeft, color: "text-green-600", bg: "bg-green-50", label: "In" },
    outflow: { icon: ArrowUpRight, color: "text-red-500", bg: "bg-red-50", label: "Out" },
    withdrawal: { icon: Minus, color: "text-amber-600", bg: "bg-amber-50", label: "Withdrawal" },
  };

  return (
    <div className="p-4 space-y-4">
      {/* Cash on Hand Card */}
      <div className="bg-[#0A0A0A] rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="w-5 h-5 text-[#C9A94E]" />
          <span className="text-xs text-gray-400 uppercase tracking-wider">Cash On Hand</span>
        </div>
        <p className="text-3xl font-bold text-[#C9A94E]">${cashOnHand.toFixed(2)}</p>
        <div className="flex gap-6 mt-3">
          <div>
            <p className="text-[10px] text-gray-500">Today In</p>
            <p className="text-sm font-semibold text-green-400">+${todayInflow.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Today Out</p>
            <p className="text-sm font-semibold text-red-400">-${todayOutflow.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => createTx.mutate({ type: "inflow", amount: 0, date: todayStr, time: format(new Date(), "HH:mm"), note: "Manual entry" })}
          variant="outline"
          className="h-12 border-green-200 text-green-700 hover:bg-green-50"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Cash In
        </Button>
        <Button
          onClick={() => setShowWithdrawal(true)}
          variant="outline"
          className="h-12 border-amber-200 text-amber-700 hover:bg-amber-50"
        >
          <Minus className="w-4 h-4 mr-2" />
          Log Withdrawal
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-9 h-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="inflow">Inflow</SelectItem>
            <SelectItem value="outflow">Outflow</SelectItem>
            <SelectItem value="withdrawal">Withdrawal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transaction List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#C9A94E]" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(tx => {
            const config = typeConfig[tx.type] || typeConfig.outflow;
            const Icon = config.icon;
            return (
              <div key={tx.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{tx.barber_name || config.label}</p>
                    <Badge variant="secondary" className="text-[9px]">{config.label}</Badge>
                  </div>
                  <p className="text-[10px] text-gray-400 truncate">
                    {tx.date} {tx.time} {tx.note && `• ${tx.note}`}
                  </p>
                </div>
                <p className={`text-sm font-bold ${tx.type === "inflow" ? "text-green-600" : "text-red-500"}`}>
                  {tx.type === "inflow" ? "+" : "-"}${(tx.amount || 0).toFixed(2)}
                </p>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-12">No transactions found.</p>
          )}
        </div>
      )}

      <WithdrawalForm
        open={showWithdrawal}
        onClose={() => setShowWithdrawal(false)}
        onSave={(data) => createTx.mutate(data)}
        barbers={barbers}
      />
    </div>
  );
}