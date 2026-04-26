import React, { useState } from "react";
import { entities } from "@/api/entities";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Plus, History, ChevronDown, ChevronUp } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import AddBarberDialog from "../components/payroll/AddBarberDialog";
import PastPayrollReports from "../components/payroll/PastPayrollReports";

export default function PayrollPage() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pastReportsOpen, setPastReportsOpen] = useState(false);
  const [expandedBarber, setExpandedBarber] = useState(null);

  const { data: barbers = [], isLoading: barbersLoading } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => entities.Barber.list(),
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["payroll-bookings", startDate, endDate],
    queryFn: async () => {
      const all = await entities.Booking.filter({ status: "completed" });
      return all.filter(b => b.date >= startDate && b.date <= endDate);
    },
  });

  const isLoading = barbersLoading || bookingsLoading;

  const payrollData = barbers
    .filter(b => b.is_active !== false)
    .map(barber => {
      const barberBookings = bookings.filter(b => b.barber_id === barber.id);
      const serviceRevenue = barberBookings.reduce((sum, b) => sum + (b.final_price ?? b.price ?? 0), 0);
      const tips = barberBookings.reduce((sum, b) => sum + (b.tip ?? 0), 0);
      // ?? preserves explicit 0% commission rates
      const commissionRate = barber.service_commission_rate ?? 50;
      const serviceCommission = serviceRevenue * (commissionRate / 100);
      const totalEarnings = serviceCommission + tips;

      return {
        id: barber.id,
        name: barber.name,
        commissionRate,
        serviceRevenue,
        serviceCommission,
        tips,
        totalEarnings,
        completedServices: barberBookings.length,
        bookings: barberBookings,
      };
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#8B9A7E]" />
      </div>
    );
  }

  const grandTotal = payrollData.reduce((sum, b) => sum + b.totalEarnings, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0A0A0A]">Payroll</h1>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setPastReportsOpen(true)}
            className="border-[#8B9A7E] text-[#8B9A7E] hover:bg-[#8B9A7E]/10"
          >
            <History className="w-4 h-4 mr-2" />
            Past Payroll Reports
          </Button>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-[#8B9A7E] hover:bg-[#6B7A5E]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Barber
          </Button>
          <Calendar className="w-5 h-5 text-[#8B9A7E]" />
          <div className="flex items-center gap-2">
            <div>
              <Label className="text-[10px] text-gray-500">From</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-40"
              />
            </div>
            <div>
              <Label className="text-[10px] text-gray-500">To</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 w-40"
              />
            </div>
          </div>
        </div>
      </div>

      <AddBarberDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <PastPayrollReports open={pastReportsOpen} onClose={() => setPastReportsOpen(false)} />

      {/* Summary Card */}
      <Card className="mb-6 bg-gradient-to-br from-[#8B9A7E]/10 to-[#B0BFA4]/10 border-[#8B9A7E]/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-600">Total Earnings Due</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-[#0A0A0A]">
            ${grandTotal.toFixed(2)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {format(parseISO(startDate), "MMM d")} – {format(parseISO(endDate), "MMM d, yyyy")}
          </p>
        </CardContent>
      </Card>

      {/* Barber Breakdown */}
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#0A0A0A]">{barber.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 bg-[#8B9A7E]/10 text-[#8B9A7E] rounded-full font-medium">
                          {barber.commissionRate}% commission
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {barber.completedServices} completed service{barber.completedServices !== 1 ? "s" : ""}
                        {barber.serviceRevenue > 0 && ` · $${barber.serviceRevenue.toFixed(2)} revenue`}
                        {barber.tips > 0 && ` · $${barber.tips.toFixed(2)} tips`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#8B9A7E]">
                          ${barber.totalEarnings.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          commission + tips
                        </div>
                      </div>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      }
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 pb-5 pt-3 space-y-3">
                    <div className="grid grid-cols-4 gap-3 text-xs">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-500">Service Revenue</p>
                        <p className="text-lg font-bold mt-1">${barber.serviceRevenue.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400">{barber.completedServices} service{barber.completedServices !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="bg-[#8B9A7E]/10 rounded-lg p-3">
                        <p className="text-gray-500">Commission ({barber.commissionRate}%)</p>
                        <p className="text-lg font-bold text-[#8B9A7E] mt-1">${barber.serviceCommission.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400">owed to barber</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-gray-500">Tips</p>
                        <p className="text-lg font-bold text-blue-600 mt-1">${barber.tips.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400">100% to barber</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-500">Shop Keeps</p>
                        <p className="text-lg font-bold mt-1">${(barber.serviceRevenue - barber.serviceCommission).toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400">{100 - barber.commissionRate}% of revenue</p>
                      </div>
                    </div>

                    {barber.bookings.length > 0 ? (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                          Completed Services
                        </p>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {barber.bookings
                            .slice()
                            .sort((a, b) => a.date.localeCompare(b.date))
                            .map(b => {
                              const price = b.final_price ?? b.price ?? 0;
                              const tipAmt = b.tip ?? 0;
                              const commission = price * barber.commissionRate / 100;
                              return (
                                <div
                                  key={b.id}
                                  className="flex items-center justify-between bg-white border border-gray-100 rounded px-3 py-2 text-xs"
                                >
                                  <div>
                                    <span className="font-medium">{b.client_name || "Walk-in"}</span>
                                    <span className="text-gray-400 ml-2">{b.service_name}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-right">
                                    <span className="text-gray-400">{b.date}</span>
                                    <span className="font-semibold text-green-700">${price.toFixed(2)}</span>
                                    <span className="text-[#8B9A7E]">→ ${commission.toFixed(2)}</span>
                                    {tipAmt > 0 && (
                                      <span className="text-blue-500">+${tipAmt.toFixed(2)} tip</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-2">
                        No completed bookings in this period.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {payrollData.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-gray-500">
              No active barbers found.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
