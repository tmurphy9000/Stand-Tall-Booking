import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import ColorLegend from "./ColorLegend";

export default function CalendarHeader({ currentDate, setCurrentDate, viewMode, setViewMode, onNewBooking, barberGroupIndex, setBarberGroupIndex, totalBarberGroups, zoomLevel, setZoomLevel, columnWidth, setColumnWidth, onRefresh, isRefreshing, showInTodayOnly, setShowInTodayOnly }) {
  const goNext = () => {
    setCurrentDate(prev => addDays(prev, viewMode === "day" ? 1 : 7));
  };
  const goPrev = () => {
    setCurrentDate(prev => addDays(prev, viewMode === "day" ? -1 : -7));
  };
  const goToday = () => setCurrentDate(new Date());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  return (
    <div className="sticky top-0 z-30 bg-[#FAFAF8] border-b border-gray-100">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goPrev} className="h-8 w-8 p-0">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday} className="h-8 text-xs">
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={goNext} className="h-8 w-8 p-0">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <h2 className="text-sm font-semibold text-[#0A0A0A]">
          {viewMode === "day"
            ? format(currentDate, "EEEE, MMM d")
            : `${format(weekStart, "MMM d")} - ${format(addDays(weekStart, 6), "MMM d, yyyy")}`
          }
        </h2>

        <div className="flex items-center gap-2">
          <ColorLegend />
          
          <button
            onClick={() => setShowInTodayOnly(prev => !prev)}
            className={cn(
              "h-8 px-3 rounded-md text-xs font-medium border transition-all",
              showInTodayOnly
                ? "bg-[#8B9A7E] text-white border-[#8B9A7E]"
                : "bg-white text-gray-500 border-gray-200 hover:border-[#8B9A7E] hover:text-[#8B9A7E]"
            )}
          >
            In Today
          </button>
          <Button
            onClick={onNewBooking}
            size="sm"
            className="h-8 bg-[#B0BFA4] hover:bg-[#8B9A7E] text-white gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Book</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-2">
        <div className="flex items-center gap-1">
          <div className="flex gap-1">
            {["day", "week"].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-all",
                  viewMode === mode
                    ? "bg-[#0A0A0A] text-white"
                    : "text-gray-500 hover:bg-gray-100"
                )}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">Height:</span>
            <input
              type="range"
              min="50"
              max="200"
              step="5"
              value={Math.round(zoomLevel * 100)}
              onChange={(e) => setZoomLevel(Number(e.target.value) / 100)}
              className="w-24 h-1 accent-[#8B9A7E]"
            />
            <span className="text-[10px] text-gray-500 min-w-[30px]">{Math.round(zoomLevel * 100)}%</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh schedule"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
            </Button>
          </div>

          {totalBarberGroups > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                disabled={barberGroupIndex === 0}
                onClick={() => setBarberGroupIndex(prev => prev - 1)}
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <span className="text-[10px] text-gray-400">
                {barberGroupIndex + 1}/{totalBarberGroups}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                disabled={barberGroupIndex >= totalBarberGroups - 1}
                onClick={() => setBarberGroupIndex(prev => prev + 1)}
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}