import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const TIMES = [];
for (let h = 6; h <= 22; h++) {
  for (let m = 0; m < 60; m += 15) {
    const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const label = new Date(2000, 0, 1, h, m).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    TIMES.push({ value: time, label });
  }
}

export default function ShopHoursEditor({ hours = {}, onChange }) {
  const updateDay = (day, field, value) => {
    const updated = { ...hours, [day]: { ...(hours[day] || { start: "08:00", end: "20:00", closed: false }), [field]: value } };
    onChange(updated);
  };

  const applyAllWeekdays = () => {
    const mon = hours.monday;
    if (!mon) return;
    const updated = { ...hours };
    ["tuesday", "wednesday", "thursday", "friday"].forEach(d => { updated[d] = { ...mon }; });
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Shop Operating Hours</h3>
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={applyAllWeekdays}>
          Mon → Weekdays
        </Button>
      </div>
      {DAYS.map(day => {
        const dayHrs = hours[day] || { start: "08:00", end: "20:00", closed: false };
        return (
          <div key={day} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
            <span className="w-12 text-xs font-medium capitalize">{day.slice(0, 3)}</span>
            <Switch checked={!dayHrs.closed} onCheckedChange={v => updateDay(day, "closed", !v)} />
            {!dayHrs.closed ? (
              <>
                <Select value={dayHrs.start || "08:00"} onValueChange={v => updateDay(day, "start", v)}>
                  <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-xs text-gray-400">to</span>
                <Select value={dayHrs.end || "20:00"} onValueChange={v => updateDay(day, "end", v)}>
                  <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <span className="text-xs text-gray-400">Closed</span>
            )}
          </div>
        );
      })}
    </div>
  );
}