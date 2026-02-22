import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, Calendar, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import AddBarberDialog from "../components/payroll/AddBarberDialog";

export default function PayrollPage() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: barbers = [], isLoading: barbersLoading } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => base44.entities.Barber.list(),
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["payroll-bookings", startDate, endDate],
    queryFn: () => base44.entities.Booking.filter({
      status: "completed",
      date: { $gte: startDate, $lte: endDate }
    }),
  });

  const isLoading = barbersLoading || bookingsLoading;

  // Calculate commission per barber
  const payrollData = barbers.map(barber => {
    const barberBookings = bookings.filter(b => b.barber_id === barber.id);
    
    const serviceRevenue = barberBookings.reduce((sum, b) => sum + (b.final_price || b.price || 0), 0);
    const serviceCommission = serviceRevenue * ((barber.service_commission_rate || 50) / 100);
    
    // Product commission would be calculated here when product sales are tracked
    const productCommission = 0;
    
    const totalCommission = serviceCommission + productCommission;
    const completedServices = barberBookings.length;

    return {
      id: barber.id,
      name: barber.name,
      serviceCommission,
      productCommission,
      totalCommission,
      completedServices,
      isActive: barber.is_active !== false,
    };
  }).filter(b => b.isActive);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#8B9A7E]" />
      </div>
    );
  }

  const grandTotal = payrollData.reduce((sum, b) => sum + b.totalCommission, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
         <h1 className="text-2xl font-bold text-[#0A0A0A]">Payroll</h1>
         <div className="flex items-center gap-4">
           <Button
             onClick={() => setDialogOpen(true)}
             className="bg-[#8B9A7E] hover:bg-[#6B7A5E]"
           >
             <Plus className="w-4 h-4 mr-2" />
             Add Barber
           </Button>
         <div className="flex items-center gap-3">
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
          </div>

          <AddBarberDialog open={dialogOpen} onOpenChange={setDialogOpen} />

          {/* Summary Card */}
      <Card className="mb-6 bg-gradient-to-br from-[#8B9A7E]/10 to-[#B0BFA4]/10 border-[#8B9A7E]/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-600">Total Commissions Due</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-[#0A0A0A]">
            ${grandTotal.toFixed(2)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {format(parseISO(startDate), "MMM d")} - {format(parseISO(endDate), "MMM d, yyyy")}
          </p>
        </CardContent>
      </Card>

      {/* Barber Breakdown */}
      <div className="grid gap-4">
        {payrollData.map(barber => (
          <Card key={barber.id} className="border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-[#0A0A0A] mb-1">{barber.name}</h3>
                  <p className="text-xs text-gray-500">
                    {barber.completedServices} completed service{barber.completedServices !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#8B9A7E]">
                    ${barber.totalCommission.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-gray-500 space-y-0.5 mt-1">
                    <div>Services: ${barber.serviceCommission.toFixed(2)}</div>
                    {barber.productCommission > 0 && (
                      <div>Products: ${barber.productCommission.toFixed(2)}</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {payrollData.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-gray-500">
              No completed bookings in this period
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}