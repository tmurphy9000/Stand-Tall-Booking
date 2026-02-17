import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { Calendar, Package, BarChart3, Banknote, Settings, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { name: "Calendar", icon: Calendar, page: "Calendar" },
  { name: "Inventory", icon: Package, page: "Inventory" },
  { name: "Reports", icon: BarChart3, page: "Reports" },
  { name: "Cash", icon: Banknote, page: "CashTracker" },
  { name: "Settings", icon: Settings, page: "Settings" },
];

export default function Layout({ children, currentPageName }) {
  const showTabs = !["ClientBooking"].includes(currentPageName);

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-[#0A0A0A] text-white px-4 py-3 flex items-center justify-between safe-area-top">
        <Link to={createPageUrl("Calendar")} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C9A94E] to-[#A07D2B] flex items-center justify-center">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-wide">STAND TALL</span>
        </Link>
      </header>

      {/* Main content */}
      <main className={cn("flex-1 overflow-auto", showTabs && "pb-20")}>
        {children}
      </main>

      {/* Bottom navigation */}
      {showTabs && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A] border-t border-white/10 safe-area-bottom">
          <div className="flex items-center justify-around px-2 py-1">
            {tabs.map((tab) => {
              const isActive = currentPageName === tab.page;
              return (
                <Link
                  key={tab.page}
                  to={createPageUrl(tab.page)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg transition-all min-w-[56px]",
                    isActive
                      ? "text-[#C9A94E]"
                      : "text-white/50 hover:text-white/80"
                  )}
                >
                  <tab.icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_6px_rgba(201,169,78,0.5)]")} />
                  <span className="text-[10px] font-medium">{tab.name}</span>
                  {isActive && (
                    <div className="w-1 h-1 rounded-full bg-[#C9A94E] mt-0.5" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}