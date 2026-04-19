import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign, Calendar, Send } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "../components/permissions/usePermissions";

export default function RunPayrollPage() {
  const { hasFullAccess } = usePermissions();
  const [dateRange, setDateRange] = useState("30");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [payDate, setPayDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings-all"],
    queryFn: () => base44.entities.Booking.list("-date", 1000),
  });

  const { data: barbers = [], isLoading: barbersLoading } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => base44.entities.Barber.list(),
  });

  const { data: cashTx = [], isLoading: cashLoading } = useQuery({
    queryKey: ["cash-all"],
    queryFn: () => base44.entities.CashTransaction.list("-created_date", 1000),
  });

  const { startDate, endDate } = useMemo(() => {
    if (dateRange === "custom") {
      return {
        startDate: customStartDate || format(subDays(new Date(), 30), "yyyy-MM-dd"),
        endDate: customEndDate || format(new Date(), "yyyy-MM-dd"),
      };
    }
    return {
      startDate: format(subDays(new Date(), parseInt(dateRange)), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
    };
  }, [dateRange, customStartDate, customEndDate]);

  const payrollData = useMemo(() => {
    const data = [];

    barbers.forEach(barber => {
      // Calculate service commissions
      const barberBookings = bookings.filter(
        b => b.barber_id === barber.id && 
        b.status === "completed" &&
        b.date >= startDate && 
        b.date <= endDate
      );

      const serviceRevenue = barberBookings.reduce((sum, b) => sum + (b.final_price || b.price || 0), 0);
      const serviceCommission = serviceRevenue * ((barber.service_commission_rate || 50) / 100);

      // Calculate tips from cash transactions
      const tips = cashTx
        .filter(tx => 
          tx.type === "inflow" && 
          tx.barber_id === barber.id && 
          tx.date >= startDate && 
          tx.date <= endDate
        )
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

      // Calculate product commissions (if applicable)
      const productCommission = tips * ((barber.product_commission_rate || 10) / 100);

      const totalEarnings = serviceCommission + productCommission + tips;

      data.push({
        barber_id: barber.id,
        barber_name: barber.name,
        barber_email: barber.email,
        service_revenue: serviceRevenue,
        service_commission: serviceCommission,
        product_commission: productCommission,
        tips: tips,
        total_earnings: totalEarnings,
        bookings_count: barberBookings.length,
      });
    });

    return data.sort((a, b) => b.total_earnings - a.total_earnings);
  }, [barbers, bookings, cashTx, startDate, endDate]);

  const totalPayroll = payrollData.reduce((sum, d) => sum + d.total_earnings, 0);

  const handleSubmitPayroll = async () => {
    setIsSubmitting(true);
    try {
      const response = await base44.functions.invoke("gustoPayroll", {
        payrollData,
        startDate,
        endDate,
        payDate,
      });

      if (response.data.success) {
        toast.success("Payroll submitted to Gusto successfully!");
      } else {
        toast.error(response.data.error || "Failed to submit payroll");
      }
    } catch (error) {
      toast.error("Error submitting payroll: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasFullAccess) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto mt-12">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">You don't have permission to run payroll.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = bookingsLoading || barbersLoading || cashLoading;

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0A0A0A]">Run Payroll</h1>
      </div>

      {/* Date Range Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Pay Period
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label className="text-xs text-gray-500">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === "custom" && (
              <>
                <div className="flex-1">
                  <Label className="text-xs text-gray-500">Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-gray-500">End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex-1">
            <Label className="text-xs text-gray-500">Pay Date</Label>
            <Input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
          </div>

          <div className="bg-[#8B9A7E]/10 rounded-lg p-3">
            <p className="text-sm text-gray-600">
              Pay Period: <span className="font-semibold">{format(new Date(startDate), "MMM d, yyyy")}</span> – <span className="font-semibold">{format(new Date(endDate), "MMM d, yyyy")}</span>
              {payDate && <> &nbsp;·&nbsp; Pay Date: <span className="font-semibold">{format(new Date(payDate), "MMM d, yyyy")}</span></>}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Summary */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#B0BFA4]" />
        </div>
      ) : (
        <>
          <Card className="border-2 border-[#8B9A7E]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Payroll</p>
                  <p className="text-3xl font-bold text-[#8B9A7E]">${totalPayroll.toFixed(2)}</p>
                  <p className="text-xs text-gray-400 mt-1">{payrollData.length} employees</p>
                </div>
                <DollarSign className="w-12 h-12 text-[#8B9A7E] opacity-20" />
              </div>
            </CardContent>
          </Card>

          {/* Barber Breakdown */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Payroll Breakdown</h2>
            {payrollData.map(barber => (
              <Card key={barber.barber_id} className="border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">{barber.barber_name}</p>
                      <p className="text-xs text-gray-500">{barber.barber_email}</p>
                      <p className="text-xs text-gray-400 mt-1">{barber.bookings_count} completed bookings</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#8B9A7E]">${barber.total_earnings.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-gray-500">Service Commission</p>
                      <p className="font-semibold text-sm mt-1">${barber.service_commission.toFixed(2)}</p>
                      <p className="text-[10px] text-gray-400">from ${barber.service_revenue.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-gray-500">Product Commission</p>
                      <p className="font-semibold text-sm mt-1">${barber.product_commission.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-gray-500">Tips</p>
                      <p className="font-semibold text-sm mt-1">${barber.tips.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button
              size="lg"
              className="bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white gap-2"
              onClick={handleSubmitPayroll}
              disabled={isSubmitting || payrollData.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit to Gusto
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}