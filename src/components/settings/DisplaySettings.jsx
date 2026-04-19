import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import ThemeCustomizer from "./ThemeCustomizer";


const STORAGE_KEY = "calendar_show_working_only";
const TIP_PREFS_KEY = "tip_display_preferences";

const ALL_TIP_OPTIONS = [
  { label: "No Tip", value: "no_tip" },
  { label: "10%", value: 10 },
  { label: "15%", value: 15 },
  { label: "20%", value: 20 },
  { label: "25%", value: 25 },
  { label: "30%", value: 30 },
  { label: "Custom", value: "custom" },
];

const DEFAULT_SELECTED = [15, 20, 25];

function loadTipPrefs() {
  try {
    const stored = localStorage.getItem(TIP_PREFS_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_SELECTED;
  } catch {
    return DEFAULT_SELECTED;
  }
}

export default function DisplaySettings() {
  const [showWorkingOnly, setShowWorkingOnly] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  const [selectedTips, setSelectedTips] = useState(loadTipPrefs);

  const handleToggle = (val) => {
    setShowWorkingOnly(val);
    localStorage.setItem(STORAGE_KEY, String(val));
  };

  const toggleTip = (value) => {
    setSelectedTips((prev) => {
      let next;
      if (prev.includes(value)) {
        next = prev.filter((v) => v !== value);
      } else {
        if (prev.length >= 3) return prev; // max 3
        next = [...prev, value];
      }
      localStorage.setItem(TIP_PREFS_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="space-y-6 max-w-md">
      <h2 className="text-sm font-semibold">Display Settings</h2>

      {/* Calendar */}
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

      <ThemeCustomizer />

      {/* Tip Preferences */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Tip Preferences</p>
          <p className="text-xs text-gray-400 mt-1">
            Select exactly 3 tip options to display to customers on the payment terminal. "No Tip" and "Custom" are always available.
          </p>
        </div>

        <div className="space-y-2">
          {/* Percentage tips: 10% → 30%, least to most */}
          <div className="flex flex-wrap gap-2">
            {ALL_TIP_OPTIONS.filter(opt => typeof opt.value === "number").map((opt) => {
              const isSelected = selectedTips.includes(opt.value);
              const isDisabled = !isSelected && selectedTips.length >= 3;
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleTip(opt.value)}
                  disabled={isDisabled}
                  className={cn(
                    "px-4 py-2 rounded-full border text-sm font-medium transition-all",
                    isSelected
                      ? "bg-[#8B9A7E] text-white border-[#8B9A7E]"
                      : isDisabled
                      ? "bg-white text-gray-300 border-gray-200 cursor-not-allowed"
                      : "bg-white text-gray-700 border-gray-300 hover:border-[#8B9A7E] cursor-pointer"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {/* No Tip + Custom side by side */}
          <div className="flex gap-2">
            {["no_tip", "custom"].map((val) => {
              const opt = ALL_TIP_OPTIONS.find(o => o.value === val);
              return (
                <button
                  key={val}
                  disabled
                  className="px-4 py-2 rounded-full border text-sm font-medium bg-gray-100 text-gray-400 border-gray-200 cursor-default"
                >
                  {opt.label} <span className="text-xs">(always shown)</span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-gray-400">
          {selectedTips.length}/3 percentage tips selected
        </p>
      </div>
    </div>
  );
}