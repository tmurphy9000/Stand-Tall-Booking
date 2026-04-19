import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Scissors, Package } from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth } from "date-fns";

export default function LeaderboardCard({ bookings, cashTransactions, barbers }) {
  const [period, setPeriod] = useState("day");

  const leaderboard = useMemo(() => {
    const now = new Date();
    let cutoffDate;
    
    if (period === "day") {
      cutoffDate = format(startOfDay(now), "yyyy-MM-dd");
    } else if (period === "week") {
      cutoffDate = format(startOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd");
    } else {
      cutoffDate = format(startOfMonth(now), "yyyy-MM-dd");
    }

    const stats = {};
    
    // Count services from completed/checked-out bookings only
    bookings.forEach(b => {
      if (b.status !== "completed" || b.date < cutoffDate) return;
      if (!stats[b.barber_name]) {
        stats[b.barber_name] = { services: 0, products: 0 };
      }
      stats[b.barber_name].services += 1;
    });

    // Count products from cash transactions
    cashTransactions.forEach(tx => {
      if (tx.type !== "inflow" || !tx.barber_name || tx.date < cutoffDate) return;
      if (!stats[tx.barber_name]) {
        stats[tx.barber_name] = { services: 0, products: 0 };
      }
      stats[tx.barber_name].products += 1;
    });

    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        services: data.services,
        products: data.products,
        total: data.services + data.products,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [bookings, cashTransactions, period]);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#B0BFA4]" />
            <CardTitle className="text-sm font-semibold">Performance Leaderboard</CardTitle>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-24 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {leaderboard.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No activity yet</p>
        ) : (
          leaderboard.map((entry, idx) => (
            <div 
              key={entry.name} 
              className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="w-6 h-6 flex items-center justify-center text-lg">
                {medals[idx] || `#${idx + 1}`}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.name}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Scissors className="w-3 h-3" />
                    {entry.services}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {entry.products}
                  </span>
                </div>
              </div>
              <div className="text-lg font-bold text-[#B0BFA4]">
                {entry.total}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}