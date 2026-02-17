import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, Users, DollarSign, Repeat } from "lucide-react";
import { RevenueChart, ServiceBreakdownChart, BarberPerformanceChart, RetentionChart, StaffPerformanceChart, ClientLifetimeValueChart, ServicePopularityChart, NoShowRatesChart } from "../components/reports/ReportCharts";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("30");
  const [barberFilter, setBarberFilter] = useState("all");

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings-all"],
    queryFn: () => base44.entities.Booking.list("-date", 1000),
  });

  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => base44.entities.Barber.list(),
  });

  const { data: cashTx = [] } = useQuery({
    queryKey: ["cash-all"],
    queryFn: () => base44.entities.CashTransaction.list("-created_date", 1000),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const cutoff = format(subDays(new Date(), parseInt(dateRange)), "yyyy-MM-dd");

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (b.date < cutoff) return false;
      if (barberFilter !== "all" && b.barber_id !== barberFilter) return false;
      return b.status !== "cancelled";
    });
  }, [bookings, cutoff, barberFilter]);

  const totalRevenue = filtered.reduce((s, b) => s + (b.final_price || b.price || 0), 0);
  const totalBookings = filtered.length;
  const uniqueClients = new Set(filtered.map(b => b.client_name?.toLowerCase())).size;

  // Repeat clients
  const clientCounts = {};
  filtered.forEach(b => {
    const key = b.client_name?.toLowerCase();
    clientCounts[key] = (clientCounts[key] || 0) + 1;
  });
  const repeatClients = Object.values(clientCounts).filter(c => c > 1).length;
  const retentionRate = uniqueClients > 0 ? Math.round((repeatClients / uniqueClients) * 100) : 0;

  // Revenue by day
  const revenueByDay = useMemo(() => {
    const map = {};
    filtered.forEach(b => {
      map[b.date] = (map[b.date] || 0) + (b.final_price || b.price || 0);
    });
    const days = eachDayOfInterval({ start: subDays(new Date(), Math.min(parseInt(dateRange), 30)), end: new Date() });
    return days.map(d => {
      const key = format(d, "yyyy-MM-dd");
      return { label: format(d, "MMM d"), revenue: map[key] || 0 };
    });
  }, [filtered, dateRange]);

  // Service breakdown
  const serviceBreakdown = useMemo(() => {
    const map = {};
    filtered.forEach(b => {
      const name = b.service_name || "Other";
      map[name] = (map[name] || 0) + (b.final_price || b.price || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [filtered]);

  // Barber performance
  const barberPerf = useMemo(() => {
    const map = {};
    filtered.forEach(b => {
      if (!map[b.barber_name]) map[b.barber_name] = { revenue: 0, bookings: 0 };
      map[b.barber_name].revenue += (b.final_price || b.price || 0);
      map[b.barber_name].bookings += 1;
    });
    return Object.entries(map).map(([name, d]) => ({ name, ...d }));
  }, [filtered]);

  // Retention over time (monthly)
  const retentionData = useMemo(() => {
    const months = {};
    bookings.forEach(b => {
      if (b.status === "cancelled") return;
      const month = b.date?.substring(0, 7);
      if (!month) return;
      if (!months[month]) months[month] = {};
      const client = b.client_name?.toLowerCase();
      months[month][client] = (months[month][client] || 0) + 1;
    });
    return Object.entries(months).sort().slice(-6).map(([month, clients]) => {
      const total = Object.keys(clients).length;
      const repeats = Object.values(clients).filter(c => c > 1).length;
      return { label: month, rate: total > 0 ? Math.round((repeats / total) * 100) : 0 };
    });
  }, [bookings]);

  // Staff performance with commission
  const staffPerformance = useMemo(() => {
    const map = {};
    filtered.forEach(b => {
      if (!map[b.barber_name]) {
        map[b.barber_name] = { 
          serviceRevenue: 0, 
          productRevenue: 0, 
          commission: 0,
          serviceCount: 0,
          productCount: 0
        };
      }
      const revenue = b.final_price || b.price || 0;
      map[b.barber_name].serviceRevenue += revenue;
      map[b.barber_name].serviceCount += 1;
      
      // Calculate commission (simplified - assuming 50% base rate)
      const barber = barbers.find(br => br.name === b.barber_name);
      const commissionRate = barber?.commission_rate || 50;
      map[b.barber_name].commission += revenue * (commissionRate / 100);
    });

    // Add product revenue from cash transactions
    cashTx.forEach(tx => {
      if (tx.type === "inflow" && tx.barber_name && tx.date >= cutoff) {
        if (!map[tx.barber_name]) {
          map[tx.barber_name] = { 
            serviceRevenue: 0, 
            productRevenue: 0, 
            commission: 0,
            serviceCount: 0,
            productCount: 0
          };
        }
        // Assume cash inflows include product sales
        map[tx.barber_name].productRevenue += tx.amount || 0;
        map[tx.barber_name].productCount += 1;
      }
    });

    return Object.entries(map).map(([name, data]) => ({ name, ...data }));
  }, [filtered, barbers, cashTx, cutoff]);

  // Client lifetime value
  const clientLTV = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      if (b.status === "cancelled") return;
      const client = b.client_name?.toLowerCase();
      if (!client) return;
      if (!map[client]) map[client] = { name: b.client_name, value: 0, visits: 0 };
      map[client].value += b.final_price || b.price || 0;
      map[client].visits += 1;
    });
    return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [bookings]);

  // Service popularity
  const servicePopularity = useMemo(() => {
    const map = {};
    filtered.forEach(b => {
      const name = b.service_name || "Other";
      if (!map[name]) map[name] = { count: 0, revenue: 0 };
      map[name].count += 1;
      map[name].revenue += b.final_price || b.price || 0;
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filtered]);

  // No-show and cancellation rates
  const noShowRates = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      if (!b.barber_name) return;
      if (!map[b.barber_name]) {
        map[b.barber_name] = { total: 0, noShow: 0, cancelled: 0 };
      }
      map[b.barber_name].total += 1;
      if (b.status === "no_show") map[b.barber_name].noShow += 1;
      if (b.status === "cancelled") map[b.barber_name].cancelled += 1;
    });

    const overall = { name: "Overall", total: 0, noShow: 0, cancelled: 0 };
    Object.values(map).forEach(d => {
      overall.total += d.total;
      overall.noShow += d.noShow;
      overall.cancelled += d.cancelled;
    });

    const result = Object.entries(map).map(([name, data]) => ({
      name,
      noShowRate: data.total > 0 ? Math.round((data.noShow / data.total) * 100) : 0,
      cancelRate: data.total > 0 ? Math.round((data.cancelled / data.total) * 100) : 0,
    }));

    result.push({
      name: "Overall",
      noShowRate: overall.total > 0 ? Math.round((overall.noShow / overall.total) * 100) : 0,
      cancelRate: overall.total > 0 ? Math.round((overall.cancelled / overall.total) * 100) : 0,
    });

    return result;
  }, [bookings]);

  const exportToPDF = async () => {
    toast.info("PDF export coming soon");
  };

  const exportToCSV = () => {
    const csvData = [
      ["Report Type", "Stand Tall Booking - Analytics Report"],
      ["Date Range", `${dateRange} days`],
      ["Generated", format(new Date(), "yyyy-MM-dd HH:mm:ss")],
      [],
      ["KPIs"],
      ["Metric", "Value"],
      ["Total Revenue", `$${totalRevenue.toFixed(2)}`],
      ["Total Bookings", totalBookings],
      ["Unique Clients", uniqueClients],
      ["Retention Rate", `${retentionRate}%`],
      [],
      ["Staff Performance"],
      ["Barber", "Service Revenue", "Product Revenue", "Commission Earned", "Total Revenue"],
      ...staffPerformance.map(s => [
        s.name, 
        `$${s.serviceRevenue.toFixed(2)}`, 
        `$${s.productRevenue.toFixed(2)}`, 
        `$${s.commission.toFixed(2)}`,
        `$${(s.serviceRevenue + s.productRevenue).toFixed(2)}`
      ]),
      [],
      ["Client Lifetime Value"],
      ["Client Name", "Total Spent", "Visits"],
      ...clientLTV.map(c => [c.name, `$${c.value.toFixed(2)}`, c.visits]),
      [],
      ["Service Popularity"],
      ["Service", "Bookings", "Revenue"],
      ...servicePopularity.map(s => [s.name, s.count, `$${s.revenue.toFixed(2)}`]),
      [],
      ["No-Show & Cancellation Rates"],
      ["Barber", "No-Show Rate", "Cancellation Rate"],
      ...noShowRates.map(n => [n.name, `${n.noShowRate}%`, `${n.cancelRate}%`]),
    ];

    const csv = csvData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stand-tall-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Report exported to CSV");
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-bold">Reports</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV} className="h-8 text-xs gap-1">
            <Download className="w-3 h-3" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPDF} className="h-8 text-xs gap-1">
            <FileText className="w-3 h-3" /> PDF
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 Days</SelectItem>
            <SelectItem value="30">30 Days</SelectItem>
            <SelectItem value="90">90 Days</SelectItem>
            <SelectItem value="365">1 Year</SelectItem>
          </SelectContent>
        </Select>
        <Select value={barberFilter} onValueChange={setBarberFilter}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Barbers</SelectItem>
            {barbers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#C9A94E]" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Revenue", value: `$${totalRevenue.toFixed(0)}`, icon: DollarSign, color: "text-[#C9A94E]" },
              { label: "Bookings", value: totalBookings, icon: TrendingUp, color: "text-[#0A0A0A]" },
              { label: "Clients", value: uniqueClients, icon: Users, color: "text-blue-600" },
              { label: "Retention", value: `${retentionRate}%`, icon: Repeat, color: "text-green-600" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 p-3">
                <div className="flex items-center gap-2">
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">{kpi.label}</span>
                </div>
                <p className={`text-xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          <RevenueChart data={revenueByDay} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ServiceBreakdownChart data={serviceBreakdown} />
            <BarberPerformanceChart data={barberPerf} />
          </div>

          <RetentionChart data={retentionData} />

          <div className="space-y-4 mt-4">
            <h2 className="text-base font-bold">Advanced Analytics</h2>
            
            <StaffPerformanceChart data={staffPerformance} />
            
            <ClientLifetimeValueChart data={clientLTV} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ServicePopularityChart data={servicePopularity} />
              <NoShowRatesChart data={noShowRates} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}