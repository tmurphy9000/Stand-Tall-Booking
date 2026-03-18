import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import ColorLegend from "./ColorLegend";

export default function CalendarHeader({ currentDate, setCurrentDate, viewMode, setViewMode, onNewBooking, barberGroupIndex, setBarberGroupIndex, totalBarberGroups, zoomLevel, setZoomLevel, columnWidth, setColumnWidth }) {
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

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">Width:</span>
            <input
              type="range"
              min="80"
              max="200"
              step="10"
              value={columnWidth}
              onChange={(e) => setColumnWidth(Number(e.target.value))}
              className="w-24 h-1 accent-[#8B9A7E]"
            />
            <span className="text-[10px] text-gray-500 min-w-[30px]">{columnWidth}px</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={zoomLevel <= 0.5}
              onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-[10px] text-gray-500 min-w-[45px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={zoomLevel >= 2}
              onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.25))}
            >
              <ZoomIn className="w-3.5 h-3.5" />
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