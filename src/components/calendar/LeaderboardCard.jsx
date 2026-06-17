import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trophy, Scissors, Package, ChevronRight, Eye, EyeOff } from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { supabase } from "@/lib/supabaseClient";

export default function LeaderboardCard({
  bookings, cashTransactions, barbers, onCollapse,
  isOwner = false,
  leaderboardVisible = true,
  onToggleVisibility,
  currentUserEmail,
}) {
  const [period, setPeriod] = useState("day");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingVisible, setPendingVisible] = useState(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [checking, setChecking] = useState(false);

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
    bookings.forEach(b => {
      if (b.status !== "completed" || b.date < cutoffDate) return;
      if (!stats[b.barber_name]) stats[b.barber_name] = { services: 0, products: 0 };
      stats[b.barber_name].services += 1;
    });
    cashTransactions.forEach(tx => {
      if (tx.type !== "inflow" || !tx.barber_name || tx.date < cutoffDate) return;
      if (!stats[tx.barber_name]) stats[tx.barber_name] = { services: 0, products: 0 };
      stats[tx.barber_name].products += 1;
    });

    return Object.entries(stats)
      .map(([name, data]) => ({ name, services: data.services, products: data.products, total: data.services + data.products }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [bookings, cashTransactions, period]);

  const medals = ["🥇", "🥈", "🥉"];

  const handleToggleClick = (newValue) => {
    setPendingVisible(newValue);
    setPassword("");
    setPasswordError("");
    setShowPasswordModal(true);
  };

  const handlePasswordConfirm = async () => {
    if (!password) { setPasswordError("Please enter your password."); return; }
    setChecking(true);
    setPasswordError("");
    const { error } = await supabase.auth.signInWithPassword({ email: currentUserEmail, password });
    setChecking(false);
    if (error) { setPasswordError("Incorrect password. Please try again."); return; }
    setShowPasswordModal(false);
    onToggleVisibility?.(pendingVisible);
  };

  return (
    <>
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#B0BFA4]" />
              <CardTitle className="text-sm font-semibold">Performance Leaderboard</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {isOwner && onToggleVisibility && (
                <div
                  className="flex items-center gap-1"
                  title={leaderboardVisible ? "Hide leaderboard from staff" : "Show leaderboard to staff"}
                >
                  {leaderboardVisible
                    ? <Eye className="w-3 h-3 text-gray-400" />
                    : <EyeOff className="w-3 h-3 text-gray-400" />}
                  <Switch
                    checked={leaderboardVisible}
                    onCheckedChange={handleToggleClick}
                    className="scale-75 data-[state=checked]:bg-[#8B9A7E]"
                  />
                </div>
              )}
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
              {onCollapse && (
                <button
                  onClick={onCollapse}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Collapse leaderboard"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {!leaderboardVisible && isOwner && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 mb-2">
              <EyeOff className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Leaderboard is hidden from staff. Only you can see this.</span>
            </div>
          )}
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
                    <span className="flex items-center gap-1"><Scissors className="w-3 h-3" />{entry.services}</span>
                    <span className="flex items-center gap-1"><Package className="w-3 h-3" />{entry.products}</span>
                  </div>
                </div>
                <div className="text-lg font-bold text-[#B0BFA4]">{entry.total}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Password confirmation modal */}
      <Dialog open={showPasswordModal} onOpenChange={(open) => { if (!open) setShowPasswordModal(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm your password</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            {pendingVisible
              ? "Enter your password to make the leaderboard visible to all staff."
              : "Enter your password to hide the leaderboard from staff."}
          </p>
          <div className="space-y-3 mt-1">
            <div>
              <Label className="text-xs">Password</Label>
              <Input
                type="password"
                className="mt-1"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePasswordConfirm()}
                autoFocus
              />
              {passwordError && <p className="text-xs text-red-500 mt-1">{passwordError}</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowPasswordModal(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#8B9A7E] hover:bg-[#6B7A5E]"
                onClick={handlePasswordConfirm}
                disabled={checking}
              >
                {checking ? "Verifying…" : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
