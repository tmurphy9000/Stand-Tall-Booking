import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

export default function ColorLegend() {
  const statuses = [
    { label: "Unconfirmed", color: "bg-green-100 border-green-500", text: "text-green-800" },
    { label: "Confirmed", color: "bg-green-100 border-green-500", text: "text-green-800" },
    { label: "Arrived", color: "bg-yellow-100 border-yellow-500", text: "text-yellow-800" },
    { label: "Completed", color: "bg-gray-200 border-gray-400", text: "text-gray-600" },
    { label: "No-Show", color: "bg-orange-50 border-orange-300", text: "text-orange-500" },
    { label: "Cancelled", color: "bg-red-50 border-red-300", text: "text-red-400" },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Info className="w-4 h-4" />
          <span className="text-xs">Color Guide</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <h4 className="text-sm font-semibold mb-3">Appointment Status Colors</h4>
        <div className="space-y-2">
          {statuses.map((status) => (
            <div key={status.label} className="flex items-center gap-2">
              <div 
                className={`w-16 h-6 rounded border-l-4 ${status.color} flex items-center justify-center`}
              >
                <span className={`text-[9px] font-medium ${status.text}`}>
                  {status.label.slice(0, 4)}
                </span>
              </div>
              <span className="text-xs text-gray-700">{status.label}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}