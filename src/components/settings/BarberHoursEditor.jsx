import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Copy } from "lucide-react";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const TIMES = [];
for (let h = 6; h <= 22; h++) {
  for (let m = 0; m < 60; m += 15) {
    const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const label = new Date(2000, 0, 1, h, m).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    TIMES.push({ value: time, label });
  }
}

export default function BarberHoursEditor({ hours = {}, onChange }) {
  const [copyFrom, setCopyFrom] = useState(null);

  const updateDay = (day, field, value) => {
    const updated = { ...hours, [day]: { ...(hours[day] || { start: "09:00", end: "18:00", off: false }), [field]: value } };
    onChange(updated);
  };

  const copyHours = (fromDay) => {
    const source = hours[fromDay];
    if (!source) return;
    const updated = { ...hours };
    DAYS.forEach(d => {
      if (d !== fromDay) updated[d] = { ...source };
    });
    onChange(updated);
  };

  const applyWeekdays = () => {
    const mon = hours.monday;
    if (!mon) return;
    const updated = { ...hours };
    ["tuesday", "wednesday", "thursday", "friday"].forEach(d => { updated[d] = { ...mon }; });
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 mb-2">
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={applyWeekdays}>
          Copy Mon → Weekdays
        </Button>
      </div>
      {DAYS.map(day => {
        const dayHours = hours[day] || { start: "09:00", end: "18:00", off: false };
        return (
          <div key={day} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
            <div className="w-20">
              <span className="text-xs font-medium capitalize">{day.slice(0, 3)}</span>
            </div>
            <Switch
              checked={!dayHours.off}
              onCheckedChange={(v) => updateDay(day, "off", !v)}
            />
            {!dayHours.off ? (
              <>
                <Select value={dayHours.start || "09:00"} onValueChange={v => updateDay(day, "start", v)}>
                  <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-xs text-gray-400">to</span>
                <Select value={dayHours.end || "18:00"} onValueChange={v => updateDay(day, "end", v)}>
                  <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyHours(day)}>
                  <Copy className="w-3 h-3" />
                </Button>
              </>
            ) : (
              <span className="text-xs text-gray-400">Off</span>
            )}
          </div>
        );
      })}
    </div>
  );
}