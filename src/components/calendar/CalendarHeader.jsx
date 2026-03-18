import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, RefreshCw, CalendarIcon } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import ColorLegend from "./ColorLegend";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export default function CalendarHeader({ currentDate, setCurrentDate, viewMode, setViewMode, onNewBooking, barberGroupIndex, setBarberGroupIndex, totalBarberGroups, zoomLevel, setZoomLevel, columnWidth, setColumnWidth, onRefresh, isRefreshing, showInTodayOnly, setShowInTodayOnly }) {
  const [calOpen, setCalOpen] = useState(false);

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

        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 text-xs font-semibold text-[#0A0A0A] hover:text-[#8B9A7E] transition-colors">
              <CalendarIcon className="w-3.5 h-3.5" />
              {viewMode === "day"
                ? format(currentDate, "EEEE, MMM d")
                : `${format(weekStart, "MMM d")} - ${format(addDays(weekStart, 6), "MMM d, yyyy")}`
              }
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-50" align="center">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={(date) => {
                if (date) {
                  setCurrentDate(date);
                  setCalOpen(false);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-2">
          <ColorLegend />
          
          <button
            onClick={() => {
              const next = !showInTodayOnly;
              setShowInTodayOnly(next);
              setBarberGroupIndex(0);
              if (next) {
                setCurrentDate(new Date());
                setViewMode("day");
              }
            }}
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