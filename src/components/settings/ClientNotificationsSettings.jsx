import React, { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Bell, Mail, MessageSquare, Clock, Star, CalendarCheck, CalendarX, Loader2 } from "lucide-react";

const STORAGE_KEY = "client_notification_settings";

const DEFAULT_SETTINGS = {
  booking_confirmation_email: true,
  booking_confirmation_sms: false,
  booking_reminder_email: true,
  booking_reminder_sms: false,
  reminder_hours_before: 24,
  cancellation_email: true,
  cancellation_sms: false,
  review_request_email: true,
  review_request_sms: false,
  review_delay_hours: 2,
};

const NOTIFICATION_ROWS = [
  {
    key: "booking_confirmation",
    icon: CalendarCheck,
    label: "Booking Confirmation",
    description: "Sent immediately when a booking is created or confirmed",
    emailKey: "booking_confirmation_email",
    smsKey: "booking_confirmation_sms",
  },
  {
    key: "booking_reminder",
    icon: Clock,
    label: "Appointment Reminder",
    description: "Sent ahead of the appointment to remind the client",
    emailKey: "booking_reminder_email",
    smsKey: "booking_reminder_sms",
    extraKey: "reminder_hours_before",
    extraLabel: "Hours before",
  },
  {
    key: "cancellation",
    icon: CalendarX,
    label: "Cancellation Notice",
    description: "Sent when an appointment is cancelled",
    emailKey: "cancellation_email",
    smsKey: "cancellation_sms",
  },
  {
    key: "review_request",
    icon: Star,
    label: "Review Request",
    description: "Sent after a completed appointment to request a review",
    emailKey: "review_request_email",
    smsKey: "review_request_sms",
    extraKey: "review_delay_hours",
    extraLabel: "Hours after visit",
  },
];

export default function ClientNotificationsSettings() {
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
      toast.success("Notification settings saved");
    }, 400);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Client Notifications</h2>
        <p className="text-sm text-gray-500 mt-1">
          Control which automated messages are sent to clients for their appointments.
        </p>
      </div>

      {/* Channel Header */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/2">
                Notification
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <span className="flex items-center justify-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Email
                </span>
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <span className="flex items-center justify-center gap-1 text-gray-400">
                  <MessageSquare className="w-3.5 h-3.5" /> SMS
                  <span className="text-[10px] font-normal">(soon)</span>
                </span>
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Timing
              </th>
            </tr>
          </thead>
          <tbody>
            {NOTIFICATION_ROWS.map((row, i) => {
              const Icon = row.icon;
              return (
                <tr key={row.key} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#8B9A7E]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-[#6B7A5E]" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{row.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{row.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Switch
                      checked={settings[row.emailKey]}
                      onCheckedChange={v => set(row.emailKey, v)}
                    />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Switch
                      checked={settings[row.smsKey]}
                      onCheckedChange={v => set(row.smsKey, v)}
                      disabled
                      className="opacity-40"
                    />
                  </td>
                  <td className="px-4 py-4 text-center">
                    {row.extraKey ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <Input
                          type="number"
                          min={1}
                          max={72}
                          value={settings[row.extraKey]}
                          onChange={e => set(row.extraKey, parseInt(e.target.value) || 1)}
                          className="w-16 h-8 text-center text-xs"
                        />
                        <span className="text-xs text-gray-400 whitespace-nowrap">{row.extraLabel}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SMS coming soon note */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-600">
        <strong>SMS notifications</strong> are coming soon as a paid add-on. Email notifications are active and sending now.
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white"
        >
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}