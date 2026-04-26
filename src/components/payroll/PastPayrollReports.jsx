import React, { useState, useMemo } from "react";
import { entities } from "@/api/entities";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

const PRESETS = [
  { label: "Last 7 days", start: format(subDays(new Date(), 7), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") },
  { label: "Last 30 days", start: format(subDays(new Date(), 30), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") },
  { label: "This month", start: format(startOfMonth(new Date()), "yyyy-MM-dd"), end: format(endOfMonth(new Date()), "yyyy-MM-dd") },
  { label: "Last month", start: format(startOfMonth(subDays(new Date(), 30)), "yyyy-MM-dd"), end: format(endOfMonth(subDays(new Date(), 30)), "yyyy-MM-dd") },
];

export default function PastPayrollReports({ open, onClose }) {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [expandedBarber, setExpandedBarber] = useState(null);

  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => entities.Barber.list(),
    enabled: open,
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["past-payroll-bookings", startDate, endDate],
    queryFn: async () => {
      const all = await entities.Booking.filter({ status: "completed" });
      return all.filter(b => b.date >= startDate && b.date <= endDate);
    },
    enabled: open,
  });

  const isLoading = bookingsLoading;

  const payrollData = useMemo(() => {
    return barbers
      .filter(b => b.is_active !== false)
      .map(barber => {
        const barberBookings = bookings.filter(b => b.barber_id === barber.id);
        const serviceRevenue = barberBookings.reduce((sum, b) => sum + (b.price ?? 0), 0);
        const productRevenue = barberBookings.reduce((sum, b) => sum + (b.product_revenue ?? 0), 0);
        const tips = barberBookings.reduce((sum, b) => sum + (b.tip ?? 0), 0);
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
          bookings: barberBookings,
        };
      })
      .sort((a, b) => b.totalEarnings - a.totalEarnings);
  }, [barbers, bookings, startDate, endDate]);

  const grandTotal = payrollData.reduce((sum, d) => sum + d.totalEarnings, 0);
  const grossRevenue = payrollData.reduce((sum, d) => sum + d.serviceRevenue + d.productRevenue, 0);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold">Past Payroll Reports</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => { setStartDate(p.start); setEndDate(p.end); }}
                className="px-3 py-1 text-xs rounded-full border border-gray-300 hover:border-[#8B9A7E] hover:bg-[#8B9A7E]/10 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom range */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-xs text-gray-500">Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-gray-500">End Date</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Period label */}
          <div className="bg-[#8B9A7E]/10 rounded-lg p-3 text-sm text-gray-600">
            <span className="font-semibold">{format(new Date(startDate), "MMM d, yyyy")}</span> – <span className="font-semibold">{format(new Date(endDate), "MMM d, yyyy")}</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#B0BFA4]" />
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-[#8B9A7E] border-2">
                  <CardContent className="p-3">
                    <p className="text-xs text-gray-500">Total Payroll</p>
                    <p className="text-2xl font-bold text-[#8B9A7E]">${grandTotal.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-gray-500">Gross Revenue</p>
                    <p className="text-2xl font-bold text-[#0A0A0A]">${grossRevenue.toFixed(2)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Per-barber breakdown */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">Breakdown by Barber</h3>
                {payrollData.map(barber => (
                  <Card key={barber.id} className="border-gray-200">
                    <CardContent className="p-3">
                      <button
                        className="w-full flex items-center justify-between"
                        onClick={() => setExpandedBarber(expandedBarber === barber.id ? null : barber.id)}
                      >
                        <div className="text-left">
                          <p className="font-semibold text-sm">{barber.name}</p>
                          <p className="text-xs text-gray-400">{barber.bookings.length} services · ${barber.serviceRevenue.toFixed(2)} revenue</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-[#8B9A7E]">${barber.totalEarnings.toFixed(2)}</span>
                          {expandedBarber === barber.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </button>

                      {expandedBarber === barber.id && (
                        <div className="mt-3 space-y-2 text-xs border-t pt-3">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-gray-50 rounded p-2">
                              <p className="text-gray-500">Service Revenue</p>
                              <p className="font-semibold mt-1">${barber.serviceRevenue.toFixed(2)}</p>
                            </div>
                            <div className="bg-[#8B9A7E]/10 rounded p-2">
                              <p className="text-gray-500">Svc Commission</p>
                              <p className="font-semibold text-[#8B9A7E] mt-1">${barber.serviceCommission.toFixed(2)}</p>
                              <p className="text-[10px] text-gray-400">{barber.serviceCommissionRate}%</p>
                            </div>
                            <div className="bg-gray-50 rounded p-2">
                              <p className="text-gray-500">Shop Keeps (Svc)</p>
                              <p className="font-semibold mt-1">${(barber.serviceRevenue - barber.serviceCommission).toFixed(2)}</p>
                              <p className="text-[10px] text-gray-400">{100 - barber.serviceCommissionRate}%</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-gray-50 rounded p-2">
                              <p className="text-gray-500">Product Revenue</p>
                              <p className="font-semibold mt-1">${barber.productRevenue.toFixed(2)}</p>
                            </div>
                            <div className="bg-purple-50 rounded p-2">
                              <p className="text-gray-500">Prod Commission</p>
                              <p className="font-semibold text-purple-600 mt-1">${barber.productCommission.toFixed(2)}</p>
                              <p className="text-[10px] text-gray-400">{barber.productCommissionRate}%</p>
                            </div>
                            <div className="bg-blue-50 rounded p-2">
                              <p className="text-gray-500">Tips</p>
                              <p className="font-semibold text-blue-600 mt-1">${barber.tips.toFixed(2)}</p>
                            </div>
                          </div>

                          {barber.bookings.length > 0 && (
                            <div className="mt-1">
                              <p className="text-gray-500 mb-1 font-medium">Services</p>
                              <div className="space-y-1 max-h-40 overflow-y-auto">
                                {barber.bookings.map(b => (
                                  <div key={b.id} className="flex justify-between bg-white border rounded px-2 py-1">
                                    <span>{b.date} — {b.service_name}</span>
                                    <div className="flex gap-2 items-center">
                                      <span className="font-medium">${(b.price ?? 0).toFixed(2)}</span>
                                      {(b.product_revenue ?? 0) > 0 && <span className="text-purple-500">+${(b.product_revenue).toFixed(2)} prod</span>}
                                      {(b.tip ?? 0) > 0 && <span className="text-blue-500">+${(b.tip).toFixed(2)} tip</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {payrollData.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-8">No completed bookings in this period.</p>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}