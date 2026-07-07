import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { Calendar, Package, BarChart3, Settings, DollarSign, ChevronLeft, ChevronRight, Users, Lock, LogOut, Megaphone, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationBell from "./components/notifications/NotificationBell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePermissions } from "./components/permissions/usePermissions";
import { useAuth } from "./lib/AuthContext";
import SetupChecklist from "./components/onboarding/SetupChecklist";

const tabs = [
  { name: "Calendar", icon: Calendar, page: "Calendar" },
  { name: "Quick Checkout", shortName: "Checkout", icon: DollarSign, page: "QuickCheckout" },
  { name: "Clients", icon: Users, page: "ClientList" },
  { name: "Inventory", icon: Package, page: "Inventory" },
  { name: "Personal Report", shortName: "Report", icon: BarChart3, page: "Reports" },
  { name: "Shop Reporting", shortName: "Shop", icon: BarChart3, page: "AdminReporting", requiresFullAccess: true },
  { name: "Transactions", icon: DollarSign, page: "Transactions", requiresFullAccess: true },
  { name: "Marketing", icon: Megaphone, page: "Marketing", requiresFullAccess: true },
];

const settingsTab = { name: "Settings", icon: Settings, page: "Settings" };

export default function Layout({ children, currentPageName }) {
  const showTabs = !["ClientList"].includes(currentPageName);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { hasFullAccess, currentBarber, user, hasPermission } = usePermissions();
  const { logout, user: authUser } = useAuth();

  return (
    <div className="h-[100dvh] bg-[#FAFAF8] dark:bg-background flex overflow-hidden">
      {/* Left Sidebar Navigation — desktop only */}
      {showTabs && (
        <nav className={cn(
          "hidden md:flex md:flex-col fixed left-0 top-0 bottom-0 z-50 bg-[#0A0A0A] border-r border-white/10 transition-all duration-300",
          sidebarCollapsed ? "w-0 -translate-x-full" : "w-20"
        )}>
          {/* Logo */}
          <Link to="/" className={cn("flex flex-col items-center py-4 border-b border-white/10 flex-shrink-0 opacity-100 hover:opacity-70 transition-opacity cursor-pointer", sidebarCollapsed && "opacity-0")}>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6993eba91209ee0a1089f355/fd9cfe023_6f5fd5cc-8fc9-4041-9d87-c24e77a3bc58.png"
              alt="Stand Tall Barbershop"
              className="w-24 h-24 rounded-lg"
            />
          </Link>

          {/* User/Sign In Section */}
          <div className={cn("px-2 py-3 border-b border-white/10 flex-shrink-0", sidebarCollapsed && "opacity-0")}>
            {(user || authUser) ? (
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-[#B0BFA4] flex items-center justify-center text-white font-bold text-sm">
                  {(user?.full_name || authUser?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="text-[9px] text-[#FAFAF8]/80 text-center leading-tight max-w-full truncate px-1">
                  {user?.full_name || authUser?.email}
                </span>
                <button
                  onClick={logout}
                  className="mt-1 flex items-center gap-1 text-[9px] text-white/40 hover:text-white/70 transition-colors"
                  title="Log out"
                >
                  <LogOut className="w-3 h-3" />
                  Log out
                </button>
              </div>
            ) : (
              <Button
                size="sm"
                className="w-full h-8 text-xs bg-[#B0BFA4] hover:bg-[#8B9A7E]"
                onClick={() => window.location.href = '/barber-login'}
              >
                Sign In
              </Button>
            )}
          </div>

          {/* Navigation Items */}
          <div className={cn("flex-1 flex flex-col py-2 gap-1 overflow-y-auto", sidebarCollapsed && "opacity-0")}>
            {tabs
              .filter(tab => {
                if (tab.requiresFullAccess && !hasFullAccess) return false;
                return true;
              })
              .map((tab) => {
                const isActive = currentPageName === tab.page;

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
          <div className={cn("border-t border-white/10 flex-shrink-0 pb-[env(safe-area-inset-bottom,0px)]", sidebarCollapsed && "opacity-0")}>
            {user && (
              <NotificationBell userEmail={user.email} userType="staff" navStyle />
            )}
            <a
              href="/help"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 py-2 px-2 transition-all relative text-[#FAFAF8]/60 hover:text-[#FAFAF8]/90 w-full"
            >
              <HelpCircle className="w-5 h-5" />
              <span className="text-[9px] font-medium text-center leading-tight">Help</span>
            </a>
            {!hasPermission('settings.general', 'modify') ? (
              <button
                onClick={() => toast.error("Access Denied", {
                  description: "You don't have permission to access this. Contact your owner or manager.",
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

          </div>
        </nav>
      )}

      {/* Collapse Toggle Button — desktop only */}
      {showTabs && (
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            "hidden md:flex fixed top-1/2 -translate-y-1/2 z-50 bg-[#0A0A0A] text-white p-2 rounded-r-lg border border-l-0 border-white/10 hover:bg-[#1A1A1A] transition-all duration-300",
            sidebarCollapsed ? "left-0" : "left-20"
          )}
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      )}

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        showTabs && (sidebarCollapsed ? "md:ml-0" : "md:ml-20"),
        showTabs && "pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0"
      )}>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Guided setup checklist — owner-only, self-dismisses after completion */}
      <SetupChecklist />

      {/* Mobile Bottom Navigation */}
      {showTabs && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A] border-t border-white/10 md:hidden pb-[env(safe-area-inset-bottom,0px)]">
          <div className="relative">
            <div className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {tabs
                .filter(tab => {
                  if (tab.requiresFullAccess && !hasFullAccess) return false;
                    return true;
                })
                .map((tab) => {
                  const isActive = currentPageName === tab.page;
                  return (
                    <Link
                      key={tab.page}
                      to={createPageUrl(tab.page)}
                      className={cn(
                        "flex flex-col items-center gap-0.5 py-2 px-3 min-w-[56px] flex-shrink-0 transition-all relative",
                        isActive ? "text-[#8B9A7E]" : "text-[#FAFAF8]/60"
                      )}
                    >
                      {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#8B9A7E] rounded-b" />}
                      <tab.icon className="w-5 h-5" />
                      <span className="text-[9px] font-medium">{tab.shortName || tab.name}</span>
                    </Link>
                  );
                })}
              {!hasPermission('settings.general', 'modify') ? (
                <button
                  onClick={() => toast.error("Access Denied", {
                    description: "Contact your owner or manager.",
                    icon: <Lock className="w-4 h-4" />
                  })}
                  className="flex flex-col items-center gap-0.5 py-2 px-3 min-w-[56px] flex-shrink-0 text-[#FAFAF8]/60"
                >
                  <Settings className="w-5 h-5" />
                  <span className="text-[9px] font-medium">Settings</span>
                </button>
              ) : (
                <Link
                  to={createPageUrl(settingsTab.page)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2 px-3 min-w-[56px] flex-shrink-0 transition-all relative",
                    currentPageName === settingsTab.page ? "text-[#8B9A7E]" : "text-[#FAFAF8]/60"
                  )}
                >
                  {currentPageName === settingsTab.page && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#8B9A7E] rounded-b" />
                  )}
                  <Settings className="w-5 h-5" />
                  <span className="text-[9px] font-medium">Settings</span>
                </Link>
              )}
              <a
                href="/help"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-0.5 py-2 px-3 min-w-[56px] flex-shrink-0 text-[#FAFAF8]/60 hover:text-[#FAFAF8]/90 transition-colors"
              >
                <HelpCircle className="w-5 h-5" />
                <span className="text-[9px] font-medium">Help</span>
              </a>
            </div>
            {/* Right-fade gradient hints that more items are reachable by scrolling */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0A0A0A] to-transparent pointer-events-none" aria-hidden="true" />
          </div>
        </nav>
      )}
    </div>
  );
}
