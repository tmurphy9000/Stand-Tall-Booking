import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { Calendar, Package, BarChart3, Banknote, Settings, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import NotificationBell from "./components/notifications/NotificationBell";

import { usePermissions } from "./components/permissions/usePermissions";
import { Users } from "lucide-react";

const tabs = [
  { name: "Calendar", icon: Calendar, page: "Calendar" },
  { name: "Schedule", icon: Users, page: "StaffSchedule" },
  { name: "Inventory", icon: Package, page: "Inventory" },
  { name: "Reports", icon: BarChart3, page: "Reports", requiresFullAccess: true },
  { name: "Cash", icon: Banknote, page: "CashTracker" },
  { name: "Settings", icon: Settings, page: "Settings" },
];

export default function Layout({ children, currentPageName }) {
  const showTabs = !["ClientBooking", "ClientPortal", "ClientHistory", "ClientDetails", "ClientList"].includes(currentPageName);
  const [user, setUser] = useState(null);
  const { hasFullAccess, currentBarber } = usePermissions();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex">
      {/* Left Sidebar Navigation */}
      {showTabs && (
        <nav className="fixed left-0 top-0 bottom-0 z-50 w-20 bg-[#0A0A0A] border-r border-white/10 flex flex-col">
          {/* Logo */}
          <Link to={createPageUrl("Calendar")} className="flex flex-col items-center py-4 border-b border-white/10">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#C9A94E] to-[#A07D2B] flex items-center justify-center">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] text-white/70 mt-1 tracking-wide">STAND</span>
          </Link>

          {/* Navigation Items */}
          <div className="flex-1 flex flex-col py-4">
            {tabs
              .filter(tab => {
                if (tab.requiresFullAccess && !hasFullAccess) return false;
                if (tab.page === "StaffSchedule" && !currentBarber && !hasFullAccess) return false;
                return true;
              })
              .map((tab) => {
                const isActive = currentPageName === tab.page;
                return (
                  <Link
                    key={tab.page}
                    to={createPageUrl(tab.page)}
                    className={cn(
                      "flex flex-col items-center gap-1 py-3 px-2 transition-all relative",
                      isActive
                        ? "text-[#C9A94E]"
                        : "text-white/50 hover:text-white/80"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#C9A94E] rounded-r" />
                    )}
                    <tab.icon className={cn("w-6 h-6", isActive && "drop-shadow-[0_0_8px_rgba(201,169,78,0.5)]")} />
                    <span className="text-[9px] font-medium text-center leading-tight">{tab.name}</span>
                  </Link>
                );
              })}
          </div>

          {/* Notification Bell at Bottom */}
          {user && (
            <div className="py-3 border-t border-white/10 flex justify-center">
              <NotificationBell userEmail={user.email} userType="staff" />
            </div>
          )}
        </nav>
      )}

      {/* Main Content Area */}
      <div className={cn("flex-1 flex flex-col", showTabs && "ml-20")}>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}