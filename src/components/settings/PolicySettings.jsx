import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CalendarX, UserX } from "lucide-react";

const STORAGE_KEY = "shop_policy_settings";

const DEFAULT_SETTINGS = {
  cancellation_enabled: true,
  cancellation_hours: 24,
  cancellation_policy_text: "We require at least 24 hours notice for cancellations. Late cancellations may be subject to a fee.",
  noshow_enabled: true,
  noshow_hours: 0,
  noshow_policy_text: "Clients who do not show up for their scheduled appointment without notice may be charged a no-show fee or required to prepay for future bookings.",
};

const HOUR_OPTIONS = [
  { value: 0, label: "At appointment time" },
  ...Array.from({ length: 72 }, (_, i) => ({ value: i + 1, label: `${i + 1} hour${i + 1 > 1 ? "s" : ""} before` })),
];

export default function PolicySettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSaving(false);
      toast.success("Policies saved");
    }, 400);
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Policies</h2>
        <p className="text-sm text-gray-500 mt-1">
          Set your cancellation and no-show policies. These can be displayed to clients during booking.
        </p>
      </div>

      {/* Cancellation Policy */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <CalendarX className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-800">Cancellation Policy</p>
              <p className="text-xs text-gray-400">Enforce a notice window for cancellations</p>
            </div>
          </div>
          <Switch
            checked={settings.cancellation_enabled}
            onCheckedChange={v => set("cancellation_enabled", v)}
          />
        </div>

        {settings.cancellation_enabled && (
          <div className="px-5 py-5 space-y-4">
            <div>
              <Label className="text-xs text-gray-500 mb-1.5 block">Cancellation Window</Label>
              <Select
                value={String(settings.cancellation_hours)}
                onValueChange={v => set("cancellation_hours", parseInt(v))}
              >
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {HOUR_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400 mt-1.5">
                Clients must cancel at least this far in advance.
              </p>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1.5 block">Policy Text</Label>
              <Textarea
                value={settings.cancellation_policy_text}
                onChange={e => set("cancellation_policy_text", e.target.value)}
                rows={4}
                placeholder="Describe your cancellation policy..."
                className="text-sm resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* No-Show Policy */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <UserX className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-800">No-Show Policy</p>
              <p className="text-xs text-gray-400">Define consequences for missed appointments</p>
            </div>
          </div>
          <Switch
            checked={settings.noshow_enabled}
            onCheckedChange={v => set("noshow_enabled", v)}
          />
        </div>

        {settings.noshow_enabled && (
          <div className="px-5 py-5 space-y-4">
            <div>
              <Label className="text-xs text-gray-500 mb-1.5 block">Policy Text</Label>
              <Textarea
                value={settings.noshow_policy_text}
                onChange={e => set("noshow_policy_text", e.target.value)}
                rows={4}
                placeholder="Describe your no-show policy..."
                className="text-sm resize-none"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white"
        >
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Policies"}
        </Button>
      </div>
    </div>
  );
}