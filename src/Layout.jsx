import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { Calendar, Package, BarChart3, Banknote, Settings, Scissors, DollarSign, ChevronLeft, ChevronRight, Users, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import NotificationBell from "./components/notifications/NotificationBell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { usePermissions } from "./components/permissions/usePermissions";

const tabs = [
  { name: "Calendar", icon: Calendar, page: "Calendar" },
  { name: "Schedule", icon: Users, page: "StaffSchedule" },
  { name: "Clients", icon: Users, page: "ClientList" },
  { name: "Inventory", icon: Package, page: "Inventory" },
  { name: "Personal Report", icon: BarChart3, page: "Reports" },
  { name: "Shop Reporting", icon: BarChart3, page: "AdminReporting", requiresFullAccess: true },
  { name: "Payroll", icon: DollarSign, page: "Payroll", requiresFullAccess: true },
  { name: "Cash", icon: Banknote, page: "CashTracker" },
];

const settingsTab = { name: "Settings", icon: Settings, page: "Settings" };

export default function Layout({ children, currentPageName }) {
  const showTabs = !["ClientBooking", "ClientPortal", "ClientHistory", "ClientDetails", "ClientList"].includes(currentPageName);
  const [user, setUser] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { hasFullAccess, currentBarber } = usePermissions();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex">
      {/* Left Sidebar Navigation */}
      {showTabs && (
        <nav className={cn(
          "fixed left-0 top-0 bottom-0 z-50 bg-[#0A0A0A] border-r border-white/10 flex flex-col transition-all duration-300 overflow-hidden",
          sidebarCollapsed ? "w-0 -translate-x-full" : "w-20"
        )}>
          {/* Logo */}
          <Link to={createPageUrl("Calendar")} className={cn("flex flex-col items-center py-4 border-b border-white/10", sidebarCollapsed && "opacity-0")}>
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6993eba91209ee0a1089f355/fd9cfe023_6f5fd5cc-8fc9-4041-9d87-c24e77a3bc58.png"
              alt="Stand Tall Barbershop"
              className="w-24 h-24 rounded-lg"
            />
          </Link>

          {/* User/Sign In Section */}
          <div className={cn("px-2 py-3 border-b border-white/10", sidebarCollapsed && "opacity-0")}>
            {user ? (
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-[#B0BFA4] flex items-center justify-center text-white font-bold text-sm">
                  {user.full_name?.charAt(0) || 'U'}
                </div>
                <span className="text-[9px] text-[#FAFAF8]/80 text-center leading-tight">{user.full_name}</span>
              </div>
            ) : (
              <Button 
                size="sm" 
                className="w-full h-8 text-xs bg-[#B0BFA4] hover:bg-[#8B9A7E]"
                onClick={() => base44.auth.redirectToLogin()}
              >
                Sign In
              </Button>
            )}
          </div>

          {/* Navigation Items */}
          <div className={cn("flex-1 flex flex-col py-2 gap-1", sidebarCollapsed && "opacity-0")}>
            {tabs
              .filter(tab => {
                if (tab.page === "StaffSchedule" && !currentBarber && !hasFullAccess) return false;
                return true;
              })
              .map((tab) => {
                const isActive = currentPageName === tab.page;
                const isLocked = tab.requiresFullAccess && !hasFullAccess;

                if (isLocked) {
                  return (
                    <button
                      key={tab.page}
                      onClick={() => toast.error("Access Denied", {
                        description: "You don't have permission to access this page",
                        icon: <Lock className="w-4 h-4" />
                      })}
                      className="flex flex-col items-center gap-1 py-2 px-2 transition-all relative text-[#FAFAF8]/60 hover:text-[#FAFAF8]/90"
                    >
                      <Lock className="w-5 h-5" />
                      <span className="text-[9px] font-medium text-center leading-tight">{tab.name}</span>
                    </button>
                  );
                }

                return (
                  <Link
                    key={tab.page}
                    to={createPageUrl(tab.page)}
                    className={cn(
                      "flex flex-col items-center gap-1 py-2 px-2 transition-all relative",
                      isActive
                        ? "text-[#8B9A7E]"
                        : "text-[#FAFAF8]/60 hover:text-[#FAFAF8]/90"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-[#8B9A7E] rounded-r" />
                    )}
                    <tab.icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_8px_rgba(139,154,126,0.5)]")} />
                    <span className="text-[9px] font-medium text-center leading-tight">{tab.name}</span>
                  </Link>
                );
              })}
          </div>

          {/* Settings and Notification Bell at Bottom */}
          <div className={cn("mt-auto border-t border-white/10", sidebarCollapsed && "opacity-0")}>
            {currentBarber?.permission_level === "service_provider" ? (
              <button
                onClick={() => toast.error("Access Denied", {
                  description: "You don't have permission to access settings",
                  icon: <Lock className="w-4 h-4" />
                })}
                className="flex flex-col items-center gap-1 py-2 px-2 transition-all relative text-[#FAFAF8]/60 hover:text-[#FAFAF8]/90 w-full"
              >
                <Lock className="w-5 h-5" />
                <span className="text-[9px] font-medium text-center leading-tight">{settingsTab.name}</span>
              </button>
            ) : (
              <Link
                to={createPageUrl(settingsTab.page)}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 px-2 transition-all relative",
                  currentPageName === settingsTab.page
                    ? "text-[#8B9A7E]"
                    : "text-[#FAFAF8]/60 hover:text-[#FAFAF8]/90"
                )}
              >
                {currentPageName === settingsTab.page && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-[#8B9A7E] rounded-r" />
                )}
                <Settings className={cn("w-5 h-5", currentPageName === settingsTab.page && "drop-shadow-[0_0_8px_rgba(139,154,126,0.5)]")} />
                <span className="text-[9px] font-medium text-center leading-tight">{settingsTab.name}</span>
              </Link>
            )}

            {user && (
              <div className="py-2 border-t border-white/10 flex justify-center">
                <NotificationBell userEmail={user.email} userType="staff" />
              </div>
            )}
          </div>
          </nav>
      )}

      {/* Collapse Toggle Button */}
      {showTabs && (
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            "fixed top-1/2 -translate-y-1/2 z-50 bg-[#0A0A0A] text-white p-2 rounded-r-lg border border-l-0 border-white/10 hover:bg-[#1A1A1A] transition-all duration-300",
            sidebarCollapsed ? "left-0" : "left-20"
          )}
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      )}

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        showTabs && (sidebarCollapsed ? "ml-0" : "ml-20")
      )}>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}