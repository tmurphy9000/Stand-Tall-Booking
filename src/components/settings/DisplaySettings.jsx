import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const STORAGE_KEY = "calendar_show_working_only";

export default function DisplaySettings() {
  const [showWorkingOnly, setShowWorkingOnly] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  const handleToggle = (val) => {
    setShowWorkingOnly(val);
    localStorage.setItem(STORAGE_KEY, String(val));
  };

  return (
    <div className="space-y-6 max-w-md">
      <h2 className="text-sm font-semibold">Display Settings</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Calendar</p>

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm font-medium">Show only barbers working today</Label>
            <p className="text-xs text-gray-400 mt-0.5">
              When enabled, only barbers scheduled for the selected day appear on the calendar. When disabled, all active barbers are shown.
            </p>
          </div>
          <Switch checked={showWorkingOnly} onCheckedChange={handleToggle} />
        </div>
      </div>
    </div>
  );
}