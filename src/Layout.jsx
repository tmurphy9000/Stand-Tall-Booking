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
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6993eba91209ee0a1089f355/fd9cfe023_6f5fd5cc-8fc9-4041-9d87-c24e77a3bc58.png"
              alt="Stand Tall Barbershop"
              className="w-12 h-12 rounded-lg"
            />
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
                        ? "text-[#8B9A7E]"
                        : "text-[#FAFAF8]/60 hover:text-[#FAFAF8]/90"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#8B9A7E] rounded-r" />
                    )}
                    <tab.icon className={cn("w-6 h-6", isActive && "drop-shadow-[0_0_8px_rgba(139,154,126,0.5)]")} />
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