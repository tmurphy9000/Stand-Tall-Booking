import React, { useState, useEffect } from "react";
import { entities } from "@/api/entities";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Plus, History, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { toast } from "sonner";
import AddBarberDialog from "../components/payroll/AddBarberDialog";
import PastPayrollReports from "../components/payroll/PastPayrollReports";
import { usePermissions } from "../components/permissions/usePermissions";
import { usePlanGate } from "@/hooks/usePlanGate";
import PlanGateModal from "@/components/PlanGateModal";

export default function PayrollPage() {
  const { hasPermission, currentBarber } = usePermissions();
  const canViewOwn = hasPermission('payroll.own');
  const canViewAll  = hasPermission('payroll.all');

  useEffect(() => {
    if (!canViewOwn) {
      toast.error("Access Denied", {
        description: "You don't have permission to access payroll. Contact your owner or manager.",
        icon: <Lock className="w-4 h-4" />,
      });
    }
  }, [canViewOwn]);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pastReportsOpen, setPastReportsOpen] = useState(false);
  const [expandedBarber, setExpandedBarber] = useState(null);
  const [gateResult, setGateResult] = useState(null);
  const { checkBarberLimit } = usePlanGate();

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

      // Service revenue = original booking price; product revenue tracked separately
      const serviceRevenue = barberBookings.reduce((sum, b) => sum + (b.price ?? 0), 0);
      const productRevenue = barberBookings.reduce((sum, b) => sum + (b.product_revenue ?? 0), 0);
      const tips = barberBookings.reduce((sum, b) => sum + (b.tip ?? 0), 0);

      // ?? preserves explicit 0% rates
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
        completedServices: barberBookings.length,
        bookings: barberBookings,
      };
    });

  if (!canViewOwn) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="font-medium text-muted-foreground">Access Denied</p>
          <p className="text-sm text-muted-foreground">Contact your owner or manager.</p>
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

  const grandTotal = payrollData.reduce((sum, b) => sum + b.totalEarnings, 0);

  // Personal payroll view for barbers without all-staff access
  if (!canViewAll && currentBarber) {
    const my = payrollData.find(d => d.id === currentBarber.id) ?? {
      serviceCommission: 0, productCommission: 0, tips: 0, totalEarnings: 0, completedServices: 0,
    };
    return (
      <div className="p-6 max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">My Payroll</h1>
        <div className="flex items-center gap-3 mb-6">
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 w-38 text-sm" />
          <span className="text-muted-foreground">–</span>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 w-38 text-sm" />
        </div>
        <div className="space-y-3">
          <Card className="border-[#8B9A7E]/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Service Commission</span>
                <span className="text-xl font-bold text-[#8B9A7E]">${my.serviceCommission.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[#8B9A7E]/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Product Commission</span>
                <span className="text-xl font-bold text-[#8B9A7E]">${my.productCommission.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[#8B9A7E]/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tips</span>
                <span className="text-xl font-bold text-[#8B9A7E]">${my.tips.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-[#8B9A7E] bg-[#8B9A7E]/5">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Total Earnings</span>
                <span className="text-2xl font-bold text-[#8B9A7E]">${my.totalEarnings.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground text-center pt-2">{my.completedServices} services completed in this period</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Payroll</h1>
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
            onClick={() => {
              const activeCount = barbers.filter(b => b.is_active !== false).length;
              const result = checkBarberLimit(activeCount);
              if (!result.allowed) {
                toast.error(`${result.planName} plan limit reached`, {
                  description: `You've reached the ${result.limit}-barber limit. Upgrade your plan to add more barbers.`,
                  action: { label: 'Upgrade', onClick: () => { window.location.href = '/Settings?tab=subscription'; } },
                });
                setGateResult(result);
                return;
              }
              setDialogOpen(true);
            }}
            className="bg-[#8B9A7E] hover:bg-[#6B7A5E]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Barber
          </Button>
          <Calendar className="w-5 h-5 text-[#8B9A7E]" />
          <div className="flex items-center gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">From</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-40"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">To</Label>
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
      <PlanGateModal
        open={!!gateResult}
        onClose={() => setGateResult(null)}
        feature={gateResult?.feature}
        planName={gateResult?.planName}
        limit={gateResult?.limit}
      />

      {/* Summary Card */}
      <Card className="mb-6 bg-gradient-to-br from-[#8B9A7E]/10 to-[#B0BFA4]/10 border-[#8B9A7E]/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings Due</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">
            ${grandTotal.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {format(parseISO(startDate), "MMM d")} – {format(parseISO(endDate), "MMM d, yyyy")}
          </p>
        </CardContent>
      </Card>

      {/* Barber Breakdown */}
      <div className="grid gap-3">
        {payrollData.map(barber => {
          const isExpanded = expandedBarber === barber.id;
          return (
            <Card key={barber.id} className="border-border hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <button
                  type="button"
                  className="w-full text-left p-5 cursor-pointer"
                  onClick={() => setExpandedBarber(isExpanded ? null : barber.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{barber.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 bg-[#8B9A7E]/10 text-[#8B9A7E] rounded-full font-medium">
                          {barber.serviceCommissionRate}% svc
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full font-medium">
                          {barber.productCommissionRate}% prod
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
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
                        <div className="text-[10px] text-muted-foreground mt-0.5">total earnings</div>
                      </div>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      }
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-5 pb-5 pt-3 space-y-3">
                    {/* Services row */}
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-muted-foreground">Service Revenue</p>
                        <p className="text-lg font-bold mt-1">${barber.serviceRevenue.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">{barber.completedServices} booking{barber.completedServices !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="bg-[#8B9A7E]/10 rounded-lg p-3">
                        <p className="text-muted-foreground">Service Commission</p>
                        <p className="text-lg font-bold text-[#8B9A7E] mt-1">${barber.serviceCommission.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">{barber.serviceCommissionRate}% of service rev</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-muted-foreground">Shop Keeps (Svc)</p>
                        <p className="text-lg font-bold mt-1">${(barber.serviceRevenue - barber.serviceCommission).toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">{100 - barber.serviceCommissionRate}% of service rev</p>
                      </div>
                    </div>

                    {/* Products row */}
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-muted-foreground">Product Revenue</p>
                        <p className="text-lg font-bold mt-1">${barber.productRevenue.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">products sold</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <p className="text-muted-foreground">Product Commission</p>
                        <p className="text-lg font-bold text-purple-600 mt-1">${barber.productCommission.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">{barber.productCommissionRate}% of product rev</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-muted-foreground">Tips</p>
                        <p className="text-lg font-bold text-blue-600 mt-1">${barber.tips.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">100% to barber</p>
                      </div>
                    </div>

                    {/* Total row */}
                    <div className="bg-[#0A0A0A] rounded-lg p-3 flex items-center justify-between text-xs">
                      <p className="text-muted-foreground">Total Earnings = service commission + product commission + tips</p>
                      <p className="text-lg font-bold text-[#8B9A7E]">${barber.totalEarnings.toFixed(2)}</p>
                    </div>

                    {/* Per-booking list */}
                    {barber.bookings.length > 0 ? (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                          Completed Services
                        </p>
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
                                <div
                                  key={b.id}
                                  className="flex items-center justify-between bg-card border border-border rounded px-3 py-2 text-xs"
                                >
                                  <div>
                                    <span className="font-medium">{b.client_name || "Walk-in"}</span>
                                    <span className="text-muted-foreground ml-2">{b.service_name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-right flex-wrap justify-end">
                                    <span className="text-muted-foreground">{b.date}</span>
                                    <span className="font-semibold text-green-700">${svcPrice.toFixed(2)}</span>
                                    <span className="text-[#8B9A7E]">→ ${svcCommission.toFixed(2)}</span>
                                    {prodRev > 0 && (
                                      <span className="text-purple-500">+${prodRev.toFixed(2)} prod → ${prodCommission.toFixed(2)}</span>
                                    )}
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
                      <p className="text-xs text-muted-foreground text-center py-2">
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
            <CardContent className="p-8 text-center text-muted-foreground">
              No active barbers found.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
