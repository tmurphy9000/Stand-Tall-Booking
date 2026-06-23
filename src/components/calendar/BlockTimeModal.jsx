import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parse, addMinutes, addDays, addWeeks } from "date-fns";
import { Ban } from "lucide-react";
import { toast } from "sonner";

const DURATION_PRESETS = [
  { label: "15 min", mins: 15 },
  { label: "30 min", mins: 30 },
  { label: "45 min", mins: 45 },
  { label: "1 hour", mins: 60 },
];

const WEEKDAYS = [
  { label: "Su", value: 0 },
  { label: "Mo", value: 1 },
  { label: "Tu", value: 2 },
  { label: "We", value: 3 },
  { label: "Th", value: 4 },
  { label: "Fr", value: 5 },
  { label: "Sa", value: 6 },
];

function hhmm(baseHHMM, offsetMins) {
  const t = parse(baseHHMM, "HH:mm", new Date());
  return format(addMinutes(t, offsetMins), "HH:mm");
}

function minutesBetween(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function formatDuration(mins) {
  if (mins <= 0) return "";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function BlockTimeModal({ open, onClose, onSave, barbers, prefill }) {
  const [barberId, setBarberId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");
  const [activePreset, setActivePreset] = useState(30);
  const [reason, setReason] = useState("");

  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatPattern, setRepeatPattern] = useState("weekly");
  const [repeatDays, setRepeatDays] = useState([]);
  const [repeatEndType, setRepeatEndType] = useState("date");
  const [repeatEndDate, setRepeatEndDate] = useState("");
  const [repeatCount, setRepeatCount] = useState(4);
  const [saving, setSaving] = useState(false);

  // Reset state whenever the modal is opened with new prefill data
  useEffect(() => {
    if (!open) return;
    const s = prefill?.start_time || "09:00";
    setBarberId(prefill?.barber_id || (barbers[0]?.id ?? ""));
    setDate(prefill?.date || format(new Date(), "yyyy-MM-dd"));
    setStartTime(s);
    setEndTime(hhmm(s, 30));
    setActivePreset(30);
    setReason("");
    setRepeatEnabled(false);
    setRepeatPattern("weekly");
    setRepeatDays([]);
    setRepeatEndType("date");
    setRepeatEndDate("");
    setRepeatCount(4);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const duration = minutesBetween(startTime, endTime);

  const handleStartChange = (val) => {
    setStartTime(val);
    if (activePreset) setEndTime(hhmm(val, activePreset));
  };

  const handlePreset = (mins) => {
    setActivePreset(mins);
    setEndTime(hhmm(startTime, mins));
  };

  const handleEndChange = (val) => {
    setEndTime(val);
    setActivePreset(null);
  };

  const toggleDay = (dayValue) => {
    setRepeatDays(prev =>
      prev.includes(dayValue) ? prev.filter(d => d !== dayValue) : [...prev, dayValue]
    );
  };

  const generatedDates = useMemo(() => {
    if (!repeatEnabled) return [date];
    const results = [];

    if (repeatPattern === "daily") {
      if (repeatEndType === "count") {
        for (let i = 0; i < repeatCount; i++) {
          results.push(format(addDays(new Date(date + "T12:00:00"), i), "yyyy-MM-dd"));
        }
      } else if (repeatEndDate) {
        let cur = new Date(date + "T12:00:00");
        const end = new Date(repeatEndDate + "T12:00:00");
        while (cur <= end && results.length < 365) {
          results.push(format(cur, "yyyy-MM-dd"));
          cur = addDays(cur, 1);
        }
      }
    } else if (repeatPattern === "weekly") {
      if (repeatEndType === "count") {
        for (let i = 0; i < repeatCount; i++) {
          results.push(format(addDays(new Date(date + "T12:00:00"), i * 7), "yyyy-MM-dd"));
        }
      } else if (repeatEndDate) {
        let cur = new Date(date + "T12:00:00");
        const end = new Date(repeatEndDate + "T12:00:00");
        while (cur <= end && results.length < 365) {
          results.push(format(cur, "yyyy-MM-dd"));
          cur = addWeeks(cur, 1);
        }
      }
    } else if (repeatPattern === "specific_days") {
      if (repeatDays.length === 0) return [];
      if (repeatEndType === "count") {
        let cur = new Date(date + "T12:00:00");
        while (results.length < repeatCount) {
          if (repeatDays.includes(cur.getDay())) results.push(format(cur, "yyyy-MM-dd"));
          cur = addDays(cur, 1);
          if (results.length > 1000) break;
        }
      } else if (repeatEndDate) {
        let cur = new Date(date + "T12:00:00");
        const end = new Date(repeatEndDate + "T12:00:00");
        while (cur <= end && results.length < 365) {
          if (repeatDays.includes(cur.getDay())) results.push(format(cur, "yyyy-MM-dd"));
          cur = addDays(cur, 1);
        }
      }
    }

    return results;
  }, [repeatEnabled, repeatPattern, repeatDays, repeatEndType, repeatEndDate, repeatCount, date]);

  const handleSave = async () => {
    if (!barberId) { toast.error("Please select a barber."); return; }
    if (!date) { toast.error("Please select a date."); return; }
    if (duration <= 0) { toast.error("End time must be after start time."); return; }
    if (repeatEnabled) {
      if (repeatPattern === "specific_days" && repeatDays.length === 0) {
        toast.error("Select at least one day of the week."); return;
      }
      if (repeatEndType === "date" && !repeatEndDate) {
        toast.error("Please set a repeat end date."); return;
      }
      if (generatedDates.length === 0) {
        toast.error("No dates match the repeat pattern."); return;
      }
    }

    const selectedBarber = barbers.find(b => b.id === barberId);
    const baseBooking = {
      barber_id: barberId,
      barber_name: selectedBarber?.name || "",
      client_name: "BLOCKED TIME",
      client_id: null,
      client_phone: "",
      client_email: "",
      service_name: reason.trim() || "Blocked",
      service_id: null,
      date,
      start_time: startTime,
      end_time: endTime,
      duration,
      price: 0,
      final_price: 0,
      status: "scheduled",
      visit_type: null,
      notes: reason.trim() || null,
    };

    let bookingData;
    if (!repeatEnabled) {
      bookingData = baseBooking;
    } else {
      const repeat_group_id = crypto.randomUUID();
      bookingData = generatedDates.map(d => ({ ...baseBooking, date: d, repeat_group_id }));
    }

    setSaving(true);
    try {
      await onSave(bookingData);
      onClose();
    } catch (err) {
      toast.error("Failed to save block: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const blockCount = repeatEnabled ? generatedDates.length : 1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Ban className="w-4 h-4 text-slate-500" />
            Block Time
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Barber */}
          <div>
            <Label className="text-xs text-muted-foreground">Barber *</Label>
            <Select value={barberId} onValueChange={setBarberId}>
              <SelectTrigger><SelectValue placeholder="Select barber" /></SelectTrigger>
              <SelectContent>
                {barbers.filter(b => b.is_active !== false).map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div>
            <Label className="text-xs text-muted-foreground">Date *</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {/* Start time */}
          <div>
            <Label className="text-xs text-muted-foreground">Start Time *</Label>
            <Input
              type="time"
              value={startTime}
              onChange={e => handleStartChange(e.target.value)}
              step="900"
            />
          </div>

          {/* Duration presets */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Duration</Label>
            <div className="flex gap-2 mb-2">
              {DURATION_PRESETS.map(p => (
                <button
                  key={p.mins}
                  type="button"
                  onClick={() => handlePreset(p.mins)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    activePreset === p.mins
                      ? "bg-[#8B9A7E] border-[#8B9A7E] text-white"
                      : "border-input bg-background hover:bg-accent text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">End Time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={e => handleEndChange(e.target.value)}
                  step="900"
                />
              </div>
              {duration > 0 && (
                <div className="mt-5 text-xs text-muted-foreground tabular-nums">
                  {formatDuration(duration)}
                </div>
              )}
            </div>
          </div>

          {/* Reason */}
          <div>
            <Label className="text-xs text-muted-foreground">Reason <span className="normal-case font-normal">(optional)</span></Label>
            <Input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Lunch, Personal appointment, Out sick"
              maxLength={80}
            />
          </div>

          {/* Repeat */}
          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Repeat this block</Label>
              <button
                type="button"
                onClick={() => setRepeatEnabled(p => !p)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  repeatEnabled ? "bg-[#8B9A7E]" : "bg-input"
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  repeatEnabled ? "translate-x-4" : "translate-x-0.5"
                }`} />
              </button>
            </div>

            {repeatEnabled && (
              <div className="space-y-3">
                {/* Pattern */}
                <div>
                  <Label className="text-xs text-muted-foreground">Pattern</Label>
                  <Select value={repeatPattern} onValueChange={setRepeatPattern}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly (same day)</SelectItem>
                      <SelectItem value="specific_days">Specific days of week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Weekday chips — only for specific_days */}
                {repeatPattern === "specific_days" && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Days</Label>
                    <div className="flex gap-1.5">
                      {WEEKDAYS.map(d => (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => toggleDay(d.value)}
                          className={`w-8 h-8 rounded-full text-xs font-medium border transition-colors ${
                            repeatDays.includes(d.value)
                              ? "bg-[#8B9A7E] border-[#8B9A7E] text-white"
                              : "border-input bg-background hover:bg-accent text-foreground"
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* End condition */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRepeatEndType("date")}
                    className={`py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      repeatEndType === "date"
                        ? "bg-foreground text-background border-foreground"
                        : "border-input bg-background hover:bg-accent text-foreground"
                    }`}
                  >
                    End by date
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepeatEndType("count")}
                    className={`py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      repeatEndType === "count"
                        ? "bg-foreground text-background border-foreground"
                        : "border-input bg-background hover:bg-accent text-foreground"
                    }`}
                  >
                    # of times
                  </button>
                </div>

                {repeatEndType === "date" ? (
                  <div>
                    <Label className="text-xs text-muted-foreground">Repeat until</Label>
                    <Input
                      type="date"
                      value={repeatEndDate}
                      onChange={e => setRepeatEndDate(e.target.value)}
                      min={date}
                    />
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs text-muted-foreground">Number of occurrences</Label>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={repeatCount}
                      onChange={e => setRepeatCount(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                )}

                {/* Preview count */}
                {blockCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Will create <span className="font-semibold text-foreground">{blockCount}</span> block{blockCount !== 1 ? "s" : ""}
                    {blockCount > 1 && repeatEndType === "date" && repeatEndDate
                      ? ` through ${format(new Date(repeatEndDate + "T12:00:00"), "MMM d, yyyy")}`
                      : ""}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving || duration <= 0}
            className="bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white"
          >
            {saving ? "Saving…" : blockCount > 1 ? `Block ${blockCount} Slots` : "Block Time"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
